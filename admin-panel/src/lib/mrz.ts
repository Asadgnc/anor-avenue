// TD3 (passport) MRZ parser — pure TS, no dependencies.
// The MRZ is the 2×44 machine-readable zone at the bottom of a passport page.
// It is designed for OCR and carries ISO 7501 check digits, so we can validate
// each field locally and flag anything the OCR mis-read for manual correction.
//
// Layout (TD3, 2 lines of 44 chars):
//   Line 1: P< ISS SURNAME<<GIVEN<NAMES<<<...              (positions 0..43)
//   Line 2: PASSPORTNO(9) C NAT(3) DOB(6) C SEX EXP(6) C PERSONAL(14) C COMPOSITE
//            0        8 9  10  12 13 18 19 20 21  26 27 28       41 42 43

export interface MrzChecks {
  passportNumber: boolean
  dateOfBirth: boolean
  expiryDate: boolean
  personalNumber: boolean
  composite: boolean
  overall: boolean
}

export interface MrzFields {
  documentType: string
  issuingCountry: string
  surname: string
  givenNames: string
  passportNumber: string
  nationality: string // ISO alpha-3 code from MRZ
  nationalityName: string // human-readable, falls back to the code
  dateOfBirth: string // ISO yyyy-mm-dd ('' if unreadable)
  sex: string // 'M' | 'F' | ''
  expiryDate: string // ISO yyyy-mm-dd ('' if unreadable)
  personalNumber: string
  raw: string // the two normalized MRZ lines joined by '\n'
  checks: MrzChecks
}

// ─── Check-digit (ISO 7501 / ICAO 9303) ────────────────────────────────────────

function charValue(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48 // 0-9
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55 // A=10 … Z=35
  return 0 // '<' filler and anything else
}

const WEIGHTS = [7, 3, 1]

export function computeCheckDigit(field: string): number {
  let sum = 0
  for (let i = 0; i < field.length; i++) {
    sum += charValue(field[i]) * WEIGHTS[i % 3]
  }
  return sum % 10
}

function verify(field: string, checkChar: string): boolean {
  if (!/^[0-9]$/.test(checkChar)) return false
  return computeCheckDigit(field) === Number(checkChar)
}

// ─── Date conversion (YYMMDD → ISO) ────────────────────────────────────────────

function toIsoDate(yymmdd: string, kind: 'dob' | 'expiry'): string {
  if (!/^[0-9]{6}$/.test(yymmdd)) return ''
  const yy = Number(yymmdd.slice(0, 2))
  const mm = yymmdd.slice(2, 4)
  const dd = yymmdd.slice(4, 6)
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return ''
  // DOB is in the past; expiry is typically in the (near) future.
  const currentYY = new Date().getFullYear() % 100
  let century: number
  if (kind === 'dob') {
    century = yy > currentYY ? 1900 : 2000
  } else {
    // expiry: assume this century unless it lands absurdly far in the future
    century = yy > currentYY + 15 ? 1900 : 2000
  }
  return `${century + yy}-${mm}-${dd}`
}

// ─── MRZ line extraction from raw OCR text ─────────────────────────────────────

// Pulls the two TD3 lines out of noisy OCR output. Rather than assuming the MRZ
// is literally the last two lines (fragile when Vision emits the printed fields
// after the MRZ, or splits/reorders lines), it scores every line for how
// MRZ-like it is and keeps the best two, then normalizes each to 44 chars.
export function extractMrzLines(text: string): [string, string] | null {
  const scored = text
    .split(/\r?\n/)
    .map((line) => {
      const compact = line.replace(/\s+/g, '').toUpperCase()
      const norm = compact.replace(/[^A-Z0-9<]/g, '')
      const mrzRatio = compact.length ? norm.length / compact.length : 0
      return { norm, mrzRatio }
    })
    // MRZ lines are long and almost entirely the MRZ alphabet (A-Z, 0-9, '<').
    .filter((c) => c.norm.length >= 28 && c.mrzRatio >= 0.8)
    .map((c) => {
      // Reward MRZ-typical lengths (44=TD3, 36=TD2, 30=TD1) and '<' fillers.
      const lenPenalty = Math.min(
        Math.abs(c.norm.length - 44),
        Math.abs(c.norm.length - 36),
        Math.abs(c.norm.length - 30)
      )
      const fill = (c.norm.match(/</g) || []).length
      return { norm: c.norm, score: c.mrzRatio * 10 + Math.min(fill, 12) - lenPenalty }
    })

  if (scored.length < 2) return null

  // Take the two most MRZ-like lines, then restore their original reading order.
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 2)
  const posA = scored.indexOf(top[0])
  const posB = scored.indexOf(top[1])
  const [first, second] = posA <= posB ? [top[0], top[1]] : [top[1], top[0]]

  // Guard against false positives: a real TD3 MRZ always carries '<' fillers.
  // If neither candidate has any and neither is a full 44-char line, bail out.
  const totalFill = (first.norm.match(/</g) || []).length + (second.norm.match(/</g) || []).length
  if (totalFill === 0 && first.norm.length < 43 && second.norm.length < 43) return null

  return [normalizeLine(first.norm), normalizeLine(second.norm)]
}

function normalizeLine(line: string): string {
  if (line.length > 44) return line.slice(0, 44)
  return line.padEnd(44, '<')
}

// ─── Field cleaners ────────────────────────────────────────────────────────────

function cleanName(part: string): string {
  return part.replace(/</g, ' ').replace(/\s+/g, ' ').trim()
}

// OCR frequently confuses O↔0 and other glyphs. In numeric-only fields we can
// safely coerce the most common letter→digit confusions.
function fixNumericField(s: string): string {
  return s
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/D/g, '0')
    .replace(/I/g, '1')
    .replace(/L/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
}

// ─── Main parser ───────────────────────────────────────────────────────────────

export function parseTd3(line1: string, line2: string): MrzFields {
  const documentType = line1[0] === 'P' ? 'P' : line1.slice(0, 1).replace(/</g, '')
  const issuingCountry = line1.slice(2, 5).replace(/</g, '')

  const nameField = line1.slice(5, 44)
  const [surnamePart, givenPart = ''] = nameField.split('<<')
  const surname = cleanName(surnamePart)
  const givenNames = cleanName(givenPart)

  const passportNumberRaw = line2.slice(0, 9)
  const passportNumberCheck = line2[9]
  const nationality = line2.slice(10, 13).replace(/</g, '')
  const dobRaw = fixNumericField(line2.slice(13, 19))
  const dobCheck = line2[19]
  const sexRaw = line2[20]
  const expiryRaw = fixNumericField(line2.slice(21, 27))
  const expiryCheck = line2[27]
  const personalRaw = line2.slice(28, 42)
  const personalCheck = line2[42]
  const compositeCheck = line2[43]

  const passportNumber = passportNumberRaw.replace(/</g, '').trim()
  const personalNumber = personalRaw.replace(/</g, '').trim()
  const sex = sexRaw === 'M' || sexRaw === 'F' ? sexRaw : ''

  const checks: MrzChecks = {
    passportNumber: verify(passportNumberRaw, passportNumberCheck),
    dateOfBirth: verify(dobRaw, dobCheck),
    expiryDate: verify(expiryRaw, expiryCheck),
    personalNumber: personalRaw.replace(/</g, '') === '' ? true : verify(personalRaw, personalCheck),
    composite: verify(
      line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 28) + line2.slice(28, 43),
      compositeCheck
    ),
    overall: false,
  }
  checks.overall = checks.passportNumber && checks.dateOfBirth && checks.expiryDate

  return {
    documentType,
    issuingCountry,
    surname,
    givenNames,
    passportNumber,
    nationality,
    nationalityName: COUNTRY_NAMES[nationality] ?? nationality,
    dateOfBirth: toIsoDate(dobRaw, 'dob'),
    sex,
    expiryDate: toIsoDate(expiryRaw, 'expiry'),
    personalNumber,
    raw: `${line1}\n${line2}`,
    checks,
  }
}

// Convenience: OCR text → parsed fields (or null if no MRZ found).
export function parseMrzFromText(text: string): MrzFields | null {
  const lines = extractMrzLines(text)
  if (!lines) return null
  return parseTd3(lines[0], lines[1])
}

// ─── ISO 3166-1 alpha-3 → English name (common travel nationalities) ───────────
// Not exhaustive; unknown codes fall back to the raw code in nationalityName.
export const COUNTRY_NAMES: Record<string, string> = {
  UZB: 'Uzbekistan',
  RUS: 'Russia',
  KAZ: 'Kazakhstan',
  KGZ: 'Kyrgyzstan',
  TJK: 'Tajikistan',
  TKM: 'Turkmenistan',
  AZE: 'Azerbaijan',
  ARM: 'Armenia',
  GEO: 'Georgia',
  BLR: 'Belarus',
  UKR: 'Ukraine',
  MDA: 'Moldova',
  TUR: 'Turkey',
  AFG: 'Afghanistan',
  PAK: 'Pakistan',
  IND: 'India',
  BGD: 'Bangladesh',
  LKA: 'Sri Lanka',
  NPL: 'Nepal',
  CHN: 'China',
  KOR: 'South Korea',
  PRK: 'North Korea',
  JPN: 'Japan',
  MNG: 'Mongolia',
  IRN: 'Iran',
  IRQ: 'Iraq',
  SAU: 'Saudi Arabia',
  ARE: 'United Arab Emirates',
  QAT: 'Qatar',
  KWT: 'Kuwait',
  BHR: 'Bahrain',
  OMN: 'Oman',
  JOR: 'Jordan',
  LBN: 'Lebanon',
  SYR: 'Syria',
  ISR: 'Israel',
  EGY: 'Egypt',
  MAR: 'Morocco',
  DZA: 'Algeria',
  TUN: 'Tunisia',
  USA: 'United States',
  CAN: 'Canada',
  MEX: 'Mexico',
  BRA: 'Brazil',
  ARG: 'Argentina',
  GBR: 'United Kingdom',
  IRL: 'Ireland',
  FRA: 'France',
  DEU: 'Germany',
  ITA: 'Italy',
  ESP: 'Spain',
  PRT: 'Portugal',
  NLD: 'Netherlands',
  BEL: 'Belgium',
  CHE: 'Switzerland',
  AUT: 'Austria',
  POL: 'Poland',
  CZE: 'Czechia',
  SVK: 'Slovakia',
  HUN: 'Hungary',
  ROU: 'Romania',
  BGR: 'Bulgaria',
  GRC: 'Greece',
  HRV: 'Croatia',
  SRB: 'Serbia',
  SVN: 'Slovenia',
  SWE: 'Sweden',
  NOR: 'Norway',
  DNK: 'Denmark',
  FIN: 'Finland',
  EST: 'Estonia',
  LVA: 'Latvia',
  LTU: 'Lithuania',
  ISL: 'Iceland',
  LUX: 'Luxembourg',
  MLT: 'Malta',
  CYP: 'Cyprus',
  AUS: 'Australia',
  NZL: 'New Zealand',
  IDN: 'Indonesia',
  MYS: 'Malaysia',
  SGP: 'Singapore',
  THA: 'Thailand',
  VNM: 'Vietnam',
  PHL: 'Philippines',
  MMR: 'Myanmar',
  KHM: 'Cambodia',
  ZAF: 'South Africa',
  NGA: 'Nigeria',
  KEN: 'Kenya',
  ETH: 'Ethiopia',
}
