'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { saveRegistrationDetailsAction, uploadRegistrationDocumentAction } from '../actions'
import PassportScanButton from '@/components/admin/PassportScanButton'
import type { MrzFields } from '@/lib/mrz'

interface GuestDoc {
  id: string
  first_name: string
  last_name: string
  nationality: string | null
  passport_number: string | null
  passport_series: string | null
  date_of_birth: string | null
  visa_number: string | null
  visa_expiry: string | null
  pinfl: string | null
  passport_expiry: string | null
  sex: string | null
}

interface RegInfo {
  registration_number: string | null
  tourist_tax_amount: number | null
  tourist_tax_paid: boolean
}

// Fields the scan can populate; used to flag which ones need manual review.
type WarnKey = 'passportNumber' | 'dateOfBirth' | 'passportExpiry'

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const baseInputStyle = {
  backgroundColor: 'var(--color-admin-bg)',
  color: 'var(--foreground)',
  borderColor: 'var(--color-admin-border)',
}
const cardStyle = { backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }

function Field({
  label, name, value, onChange, type = 'text', warn = false,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  warn?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
        {label}{warn && <span style={{ color: '#EF4444' }}> ⚠</span>}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        style={warn ? { ...baseInputStyle, borderColor: '#EF4444' } : baseInputStyle}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
      <span style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      <span className="text-foreground text-right">{value || '—'}</span>
    </div>
  )
}

export default function RegistrationDetailForm({
  registrationId,
  guest,
  registration,
  documentSignedUrl,
}: {
  registrationId: string
  guest: GuestDoc | null
  registration: RegInfo
  documentSignedUrl: string | null
}) {
  const router = useRouter()
  const t = useTranslations('registrations.detail')
  const tf = useTranslations('registrations.detail.fields')
  const tdoc = useTranslations('registrations.detail.document')
  const ts = useTranslations('scan')
  const tc = useTranslations('common')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [scanInfo, setScanInfo] = useState<string | null>(null)
  const [warn, setWarn] = useState<Set<WarnKey>>(new Set())

  // Controlled form state (so the scanner can fill it)
  const [passportSeries, setPassportSeries] = useState(guest?.passport_series ?? '')
  const [passportNumber, setPassportNumber] = useState(guest?.passport_number ?? '')
  const [passportExpiry, setPassportExpiry] = useState(guest?.passport_expiry ?? '')
  const [sex, setSex] = useState(guest?.sex ?? '')
  const [visaNumber, setVisaNumber] = useState(guest?.visa_number ?? '')
  const [visaExpiry, setVisaExpiry] = useState(guest?.visa_expiry ?? '')
  const [pinfl, setPinfl] = useState(guest?.pinfl ?? '')
  const [nationality, setNationality] = useState(guest?.nationality ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(guest?.date_of_birth ?? '')
  const [registrationNumber, setRegistrationNumber] = useState(registration.registration_number ?? '')
  const [touristTaxAmount, setTouristTaxAmount] = useState(
    registration.tourist_tax_amount != null ? String(registration.tourist_tax_amount) : ''
  )
  const [touristTaxPaid, setTouristTaxPaid] = useState(registration.tourist_tax_paid)
  const [mrzRaw, setMrzRaw] = useState('')

  function applyScan(f: MrzFields) {
    setEditing(true)
    if (f.passportNumber) setPassportNumber(f.passportNumber)
    if (f.nationalityName) setNationality(f.nationalityName)
    if (f.dateOfBirth) setDateOfBirth(f.dateOfBirth)
    if (f.expiryDate) setPassportExpiry(f.expiryDate)
    if (f.sex) setSex(f.sex)
    setMrzRaw(f.raw)

    const w = new Set<WarnKey>()
    if (!f.checks.passportNumber) w.add('passportNumber')
    if (!f.checks.dateOfBirth) w.add('dateOfBirth')
    if (!f.checks.expiryDate) w.add('passportExpiry')
    setWarn(w)
    setScanInfo(w.size > 0 ? ts('reviewWarning') : ts('filledBanner'))
  }

  async function handleScanImage(file: File) {
    // Store the captured passport photo as the registration document too.
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('document', file)
    const result = await uploadRegistrationDocumentAction(registrationId, fd)
    setUploading(false)
    if (result.error) setUploadError(result.error)
    else router.refresh()
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await saveRegistrationDetailsAction(registrationId, new FormData(e.currentTarget))
    setSaving(false)
    if (result.error) setError(result.error)
    else { setEditing(false); setScanInfo(null); setWarn(new Set()); router.refresh() }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    setUploadError(null)
    const form = e.currentTarget
    const result = await uploadRegistrationDocumentAction(registrationId, new FormData(form))
    setUploading(false)
    if (result.error) setUploadError(result.error)
    else { form.reset(); router.refresh() }
  }

  const sexLabel = sex === 'M' ? tf('sexMale') : sex === 'F' ? tf('sexFemale') : ''

  return (
    <div className="space-y-6">
      {/* Passport scan — entry point (koordinasyon: bu kayıt bağlamının içinde) */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-admin-muted)' }}>
          {ts('sectionTitle')}
        </p>
        <PassportScanButton onResult={applyScan} onImage={handleScanImage} />
        {scanInfo && (
          <p
            className="mt-3 text-xs px-3 py-2 rounded-lg"
            style={warn.size > 0
              ? { backgroundColor: '#FEF3C7', color: '#92400E' }
              : { backgroundColor: '#DCFCE7', color: '#166534' }}
          >
            {scanInfo}
          </p>
        )}
      </div>

      {/* Belge + registratsiya bilgileri */}
      <div className="rounded-2xl" style={cardStyle}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
            {t('guestSection')}
          </p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-accent)', borderColor: 'var(--color-admin-border)' }}
            >
              {t('editButton')}
            </button>
          )}
        </div>

        {!editing && (
          <div className="px-5 pb-3">
            <Row label={tf('passportSeries')} value={passportSeries} />
            <Row label={tf('passportNumber')} value={passportNumber} />
            <Row label={tf('passportExpiry')} value={passportExpiry} />
            <Row label={tf('sex')} value={sexLabel} />
            <Row label={tf('visaNumber')} value={visaNumber} />
            <Row label={tf('visaExpiry')} value={visaExpiry} />
            <Row label={tf('pinfl')} value={pinfl} />
            <Row label={tf('nationality')} value={nationality} />
            <Row label={tf('dob')} value={dateOfBirth} />
            <Row label={tf('registrationNumber')} value={registrationNumber} />
            <Row label={tf('touristTaxAmount')} value={touristTaxAmount} />
            <Row label={tf('touristTaxPaid')} value={touristTaxPaid ? t('yes') : t('no')} />
          </div>
        )}

        {editing && (
          <form onSubmit={handleSave} className="px-5 py-4">
            {error && (
              <p className="mb-4 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>{error}</p>
            )}
            <input type="hidden" name="mrzRaw" value={mrzRaw} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={tf('passportSeries')} name="passportSeries" value={passportSeries} onChange={setPassportSeries} />
              <Field label={tf('passportNumber')} name="passportNumber" value={passportNumber} onChange={setPassportNumber} warn={warn.has('passportNumber')} />
              <Field label={tf('passportExpiry')} name="passportExpiry" type="date" value={passportExpiry} onChange={setPassportExpiry} warn={warn.has('passportExpiry')} />
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>{tf('sex')}</label>
                <select
                  name="sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className={inputCls}
                  style={baseInputStyle}
                >
                  <option value="">—</option>
                  <option value="M">{tf('sexMale')}</option>
                  <option value="F">{tf('sexFemale')}</option>
                </select>
              </div>
              <Field label={tf('visaNumber')} name="visaNumber" value={visaNumber} onChange={setVisaNumber} />
              <Field label={tf('visaExpiry')} name="visaExpiry" type="date" value={visaExpiry} onChange={setVisaExpiry} />
              <Field label={tf('pinfl')} name="pinfl" value={pinfl} onChange={setPinfl} />
              <Field label={tf('nationality')} name="nationality" value={nationality} onChange={setNationality} />
              <Field label={tf('dob')} name="dateOfBirth" type="date" value={dateOfBirth} onChange={setDateOfBirth} warn={warn.has('dateOfBirth')} />
              <Field label={tf('registrationNumber')} name="registrationNumber" value={registrationNumber} onChange={setRegistrationNumber} />
              <Field label={tf('touristTaxAmount')} name="touristTaxAmount" type="number" value={touristTaxAmount} onChange={setTouristTaxAmount} />
              <label className="flex items-center gap-2 text-sm self-end pb-2" style={{ color: 'var(--foreground)' }}>
                <input type="checkbox" name="touristTaxPaid" checked={touristTaxPaid} onChange={(e) => setTouristTaxPaid(e.target.checked)} />
                {tf('touristTaxPaid')}
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
              >
                {saving ? t('savingButton') : t('saveButton')}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null) }}
                className="px-4 py-2 rounded-lg text-sm border transition-opacity hover:opacity-80"
                style={{ color: 'var(--color-admin-muted)', borderColor: 'var(--color-admin-border)' }}
              >
                {t('cancelButton')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Belge (PDF / görsel) */}
      <div className="rounded-2xl" style={cardStyle}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
            {t('docSection')}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {documentSignedUrl ? (
            <a
              href={documentSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--color-accent)' }}
            >
              {tdoc('viewButton')}
            </a>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{tdoc('noDocument')}</p>
          )}

          <form onSubmit={handleUpload} className="flex items-center gap-3 flex-wrap">
            <input
              name="document"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              className="text-sm"
              style={{ color: 'var(--color-admin-muted)' }}
            />
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
            >
              {uploading ? tdoc('uploading') : documentSignedUrl ? tdoc('replaceButton') : tdoc('uploadButton')}
            </button>
          </form>
          {uploadError && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>
              {tc('error')}: {uploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
