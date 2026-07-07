// process-photos.mjs — Ücretsiz foto işleme hattı — Anor Avenue guest-site.
//
// Ne yapar:
//   guest-site/photos-incoming/ (ALT KLASÖRLER DAHİL, örn. newphotos/) altındaki
//   ham fotoğrafları okur, dosya adının başındaki oda numarasına (veya "common"
//   kelimelerine) göre gruplar, web için WebP'ye çevirip şuraya dizer:
//     public/hotel-photos/rooms/{odaNo}/...webp
//     public/hotel-photos/common/{kategori}-{n}.webp
//   Her oda için en iyi (geniş açı) görsel => cover.webp
//
// HEIC/HEIF (iPhone) girişleri: sharp bu dosyaların çoğunu libheif güvenlik
// limiti yüzünden açamıyor → önce heic-convert ile JPEG'e çözülür, sonra sharp.
//
// Dosya adı kuralı ("isim odayı belli eder"):
//   202-jacuzzi.jpg / 202 jakuzi.jpg / 202jakuzi.jpg  -> rooms/202/jakuzi.webp
//   201odaultragenishguzelachi.jpg                    -> rooms/201/... (kapak adayı)
//   kahvalti3.JPG                                     -> common/breakfast-N.webp
//   bahcheguzelachi.jpg                               -> common/garden-N.webp
//   common-reception.jpg                              -> common/reception-N.webp
//
// Çalıştırma:
//   cd guest-site
//   node scripts/process-photos.mjs
//
// Not: Ham dosyalara dokunmaz; sadece okur. Tekrar çalıştırılabilir (idempotent).
//      "_" veya "." ile başlayan klasörler atlanır (örn. _archive/).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const INCOMING = path.join(ROOT, 'photos-incoming')
const OUT_ROOMS = path.join(ROOT, 'public', 'hotel-photos', 'rooms')
const OUT_COMMON = path.join(ROOT, 'public', 'hotel-photos', 'common')

const MAX_WIDTH = 1920 // hero/kapak üst sınırı
const QUALITY = 80 // WebP kalite (yavaş internet için makul)

const IMG_RE = /\.(jpe?g|png|webp|heic|heif)$/i
const HEIC_RE = /\.(heic|heif)$/i

let sharp
let heicConvert
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('\n[HATA] "sharp" kurulu değil. Çalıştır:\n  cd guest-site && pnpm add -D sharp\n')
  process.exit(1)
}
try {
  heicConvert = (await import('heic-convert')).default
} catch {
  console.error('\n[HATA] "heic-convert" kurulu değil. Çalıştır:\n  cd guest-site && pnpm add -D heic-convert\n')
  process.exit(1)
}

// Ortak-alan kelime -> kategori (öncelik sırasıyla; ilk eşleşen kazanır).
// Not: "bahche"/"bakcha" gibi latin çevriyazımları da yakalanır.
const COMMON_WORDS = [
  [/(kahvalt|breakfast|nonushta|zavtrak|nonusht)/i, 'breakfast'],
  [/(bach|bah[cç]|bagh|garden|hovli|bog['`]?cha|dvor)/i, 'garden'],
  [/(resepsiyon|resepshon|reception|lobi|lobby|qabul)/i, 'reception'],
  [/(mutfak|kitchen|oshxona)/i, 'kitchen'],
  [/(cephe|d[ıi]s|exterior|facade|bino)/i, 'exterior'],
  [/(koridor|corridor|hallway|dahliz)/i, 'corridor'],
  [/(camasir|çama[sş]ir|laundry|kir\s?xona)/i, 'laundry'],
]

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseName(fileName) {
  const base = fileName.replace(IMG_RE, '')
  // "common-..." açık ön eki
  const commonMatch = base.match(/^common[-_ ]*(.*)$/i)
  if (commonMatch) {
    for (const [re, cat] of COMMON_WORDS) if (re.test(commonMatch[1])) return { group: 'common', category: cat }
    return { group: 'common', category: 'common' }
  }
  // Baştaki oda numarası (2-4 hane): "202-jacuzzi", "201guzel", "303odayatak2"
  const roomMatch = base.match(/^(\d{2,4})[-_ ().]*(.*)$/)
  if (roomMatch) return { group: roomMatch[1], desc: slug(roomMatch[2]) }
  // Oda numarası yok → ortak-alan kelimesi ara
  for (const [re, cat] of COMMON_WORDS) if (re.test(base)) return { group: 'common', category: cat }
  return { group: null, desc: slug(base) }
}

// Bir odanın "kapak olma" puanı — geniş açı/oda/yatak/manzara yüksek, banyo/koridor düşük.
function coverScore(descRaw) {
  const d = descRaw.toLowerCase()
  let s = 0
  if (/(banyo|tuvalet|wc|dush|shower|kuvet|k[uü]vet|jakuzi|jacuzzi)/.test(d)) s -= 6
  if (/(koridor|corridor|hall|entrance|kirish|giris|giriş)/.test(d)) s -= 3
  if (/(oda|room|yatak|bed|suite|suit|lux|sandalye|dolap|sofa)/.test(d)) s += 4
  if (/(genis|genish|geni[sş]|wide|manzara|view|guzel|go['`]?zal)/.test(d)) s += 3 // geniş/güzel açı = iyi kapak
  if (/(ultra|chok|çok|cok)/.test(d)) s += 2 // "ultragenish", "chokgenish"
  if (d === '' || d === '1' || d === 'cover') s += 6
  return s
}

// Bir görsel dosyasını sharp'a verilebilir girdiye çevirir (HEIC → JPEG buffer).
async function toSharpInput(absPath) {
  if (HEIC_RE.test(absPath)) {
    const inputBuffer = await fs.readFile(absPath)
    const jpeg = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.95 })
    return jpeg // Buffer
  }
  return absPath // sharp yolu doğrudan okur
}

// photos-incoming'i recursive tara; "_" / "." ile başlayan klasörleri atla.
async function walk(dir) {
  const out = []
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (IMG_RE.test(e.name)) out.push(full)
  }
  return out
}

async function main() {
  const files = (await walk(INCOMING)).sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
  if (files.length === 0) {
    console.log(`Gelen kutusunda işlenecek görsel yok: ${INCOMING}`)
    return
  }

  // 1) Ayrıştır + grupla
  const rooms = new Map() // odaNo -> [{ abs, desc }]
  const commons = new Map() // kategori -> [abs]
  const skipped = []
  for (const abs of files) {
    const { group, desc, category } = parseName(path.basename(abs))
    if (group === 'common') {
      if (!commons.has(category)) commons.set(category, [])
      commons.get(category).push(abs)
    } else if (group) {
      if (!rooms.has(group)) rooms.set(group, [])
      rooms.get(group).push({ abs, desc })
    } else {
      skipped.push(path.basename(abs))
    }
  }

  let ok = 0

  // 2) Odalar — kapak seç + yaz
  for (const [room, items] of rooms) {
    const outDir = path.join(OUT_ROOMS, room)
    await fs.mkdir(outDir, { recursive: true })

    let coverIdx = -1
    let best = -Infinity
    items.forEach((it, idx) => {
      const sc = coverScore(it.desc)
      if (sc > best) {
        best = sc
        coverIdx = idx
      }
    })

    const used = new Set()
    let counter = 0
    for (let idx = 0; idx < items.length; idx++) {
      const { abs, desc } = items[idx]
      let name = idx === coverIdx ? 'cover' : desc || `photo-${++counter}`
      while (used.has(name)) name = `${name}-${++counter}`
      used.add(name)
      const outPath = path.join(outDir, `${name}.webp`)
      try {
        const input = await toSharpInput(abs)
        await sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(outPath)
        ok++
        console.log(`  ✓ ${path.basename(abs)}  ->  ${path.relative(ROOT, outPath)}`)
      } catch (e) {
        skipped.push(`${path.basename(abs)} (${e.message})`)
      }
    }
  }

  // 3) Ortak alanlar — kategori-{n}.webp (sıralı, çakışmasız)
  await fs.mkdir(OUT_COMMON, { recursive: true })
  for (const [category, list] of commons) {
    list.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
    let n = 0
    for (const abs of list) {
      n++
      const outPath = path.join(OUT_COMMON, `${category}-${n}.webp`)
      try {
        const input = await toSharpInput(abs)
        await sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(outPath)
        ok++
        console.log(`  ✓ ${path.basename(abs)}  ->  ${path.relative(ROOT, outPath)}`)
      } catch (e) {
        skipped.push(`${path.basename(abs)} (${e.message})`)
      }
    }
  }

  console.log(`\nBitti: ${ok} görsel işlendi.`)
  if (skipped.length) {
    console.log(`\nAtlanan (oda no'su çözülemedi / hata):`)
    for (const s of skipped) console.log(`  - ${s}`)
  }
}

main()
