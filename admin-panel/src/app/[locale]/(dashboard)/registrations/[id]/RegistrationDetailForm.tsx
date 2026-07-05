'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { saveRegistrationDetailsAction, uploadRegistrationDocumentAction } from '../actions'

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
}

interface RegInfo {
  registration_number: string | null
  tourist_tax_amount: number | null
  tourist_tax_paid: boolean
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const inputStyle = {
  backgroundColor: 'var(--color-admin-bg)',
  color: 'var(--foreground)',
  borderColor: 'var(--color-admin-border)',
}
const cardStyle = { backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }

function Field({ label, name, defaultValue, type = 'text' }: {
  label: string; name: string; defaultValue?: string | null; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ''} className={inputCls} style={inputStyle} />
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
  const tc = useTranslations('common')

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await saveRegistrationDetailsAction(registrationId, new FormData(e.currentTarget))
    setSaving(false)
    if (result.error) setError(result.error)
    else { setEditing(false); router.refresh() }
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

  return (
    <div className="space-y-6">
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
            <Row label={tf('passportSeries')} value={guest?.passport_series ?? ''} />
            <Row label={tf('passportNumber')} value={guest?.passport_number ?? ''} />
            <Row label={tf('visaNumber')} value={guest?.visa_number ?? ''} />
            <Row label={tf('visaExpiry')} value={guest?.visa_expiry ?? ''} />
            <Row label={tf('pinfl')} value={guest?.pinfl ?? ''} />
            <Row label={tf('nationality')} value={guest?.nationality ?? ''} />
            <Row label={tf('dob')} value={guest?.date_of_birth ?? ''} />
            <Row label={tf('registrationNumber')} value={registration.registration_number ?? ''} />
            <Row
              label={tf('touristTaxAmount')}
              value={registration.tourist_tax_amount != null ? String(registration.tourist_tax_amount) : ''}
            />
            <Row label={tf('touristTaxPaid')} value={registration.tourist_tax_paid ? t('yes') : t('no')} />
          </div>
        )}

        {editing && (
          <form onSubmit={handleSave} className="px-5 py-4">
            {error && (
              <p className="mb-4 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>{error}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label={tf('passportSeries')} name="passportSeries" defaultValue={guest?.passport_series} />
              <Field label={tf('passportNumber')} name="passportNumber" defaultValue={guest?.passport_number} />
              <Field label={tf('visaNumber')} name="visaNumber" defaultValue={guest?.visa_number} />
              <Field label={tf('visaExpiry')} name="visaExpiry" type="date" defaultValue={guest?.visa_expiry} />
              <Field label={tf('pinfl')} name="pinfl" defaultValue={guest?.pinfl} />
              <Field label={tf('nationality')} name="nationality" defaultValue={guest?.nationality} />
              <Field label={tf('dob')} name="dateOfBirth" type="date" defaultValue={guest?.date_of_birth} />
              <Field label={tf('registrationNumber')} name="registrationNumber" defaultValue={registration.registration_number} />
              <Field
                label={tf('touristTaxAmount')}
                name="touristTaxAmount"
                type="number"
                defaultValue={registration.tourist_tax_amount != null ? String(registration.tourist_tax_amount) : ''}
              />
              <label className="flex items-center gap-2 text-sm self-end pb-2" style={{ color: 'var(--foreground)' }}>
                <input type="checkbox" name="touristTaxPaid" defaultChecked={registration.tourist_tax_paid} />
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

      {/* PDF belgesi */}
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
