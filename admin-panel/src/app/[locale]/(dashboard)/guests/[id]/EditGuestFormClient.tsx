'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { updateGuestAction } from '@/app/[locale]/(dashboard)/guests/actions'

interface GuestDetail {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  passport_number: string | null
  passport_series: string | null
  date_of_birth: string | null
  address: string | null
  notes: string | null
  created_at: string
}

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none'
const inputStyle = {
  backgroundColor: 'var(--color-admin-bg)',
  color: 'var(--foreground)',
  borderColor: 'var(--color-admin-border)',
}

function Field({ label, name, defaultValue, type = 'text', half = false }: {
  label: string; name: string; defaultValue?: string | null; type?: string; half?: boolean
}) {
  return (
    <div className={half ? '' : 'col-span-2'}>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        className={inputCls}
        style={inputStyle}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
      <span style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      <span className="text-foreground text-right">{value || '—'}</span>
    </div>
  )
}

export default function EditGuestFormClient({ guest }: { guest: GuestDetail }) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('guests.editForm')
  const tf = useTranslations('guests.editForm.fields')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await updateGuestAction(guest.id, new FormData(e.currentTarget))
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setEditing(false)
      router.refresh()
    }
  }

  return (
    <div className="rounded-2xl" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
          {t('sectionTitle')}
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

      {/* View mode */}
      {!editing && (
        <div className="px-5 pb-2">
          <Row label={tf('fullName')} value={`${guest.first_name} ${guest.last_name}`} />
          <Row label={tf('phone')} value={guest.phone ?? ''} />
          <Row label={tf('email')} value={guest.email ?? ''} />
          <Row label={tf('nationality')} value={guest.nationality ?? ''} />
          <Row label={tf('passportNo')} value={guest.passport_number ?? ''} />
          <Row label={tf('passportSeries')} value={guest.passport_series ?? ''} />
          <Row label={tf('dob')} value={guest.date_of_birth ?? ''} />
          <Row label={tf('address')} value={guest.address ?? ''} />
          {guest.notes && <Row label={tf('notes')} value={guest.notes} />}
          <Row label={tf('registeredAt')} value={new Date(guest.created_at).toLocaleDateString(LOCALE_BCP47[locale] ?? 'ru-RU')} />
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <form onSubmit={handleSubmit} className="px-5 py-4">
          {error && (
            <p className="mb-4 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#FDEAEA', color: '#EF4444' }}>
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={tf('firstNameRequired')} name="firstName" defaultValue={guest.first_name} half />
            <Field label={tf('lastNameRequired')} name="lastName" defaultValue={guest.last_name} half />
            <Field label={tf('phone')} name="phone" defaultValue={guest.phone} half />
            <Field label={tf('email')} name="email" type="email" defaultValue={guest.email} half />
            <Field label={tf('nationality')} name="nationality" defaultValue={guest.nationality} half />
            <Field label={tf('passportNo')} name="passportNumber" defaultValue={guest.passport_number} half />
            <Field label={tf('passportSeries')} name="passportSeries" defaultValue={guest.passport_series} half />
            <Field label={tf('dob')} name="dateOfBirth" type="date" defaultValue={guest.date_of_birth} half />
            <Field label={tf('address')} name="address" defaultValue={guest.address} />
            <Field label={tf('notes')} name="notes" defaultValue={guest.notes} />
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
  )
}
