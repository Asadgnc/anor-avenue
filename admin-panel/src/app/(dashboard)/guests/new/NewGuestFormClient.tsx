'use client'

import { useActionState } from 'react'
import { createGuestAction, type GuestFormState } from './actions'

export default function NewGuestFormClient() {
  const [state, action, isPending] = useActionState<GuestFormState, FormData>(createGuestAction, {})

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-[#E8E8F0] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
  const inputStyle = { backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }
  const labelStyle = { color: 'var(--color-admin-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'block', marginBottom: '0.375rem' }

  function field(name: string, label: string, type = 'text', required = false) {
    return (
      <div>
        <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
        <input name={name} type={type} required={required} disabled={isPending} className={inputClass} style={inputStyle} />
        {state.fieldErrors?.[name] && (
          <p className="text-xs mt-0.5" style={{ color: '#FCA5A5' }}>{state.fieldErrors[name]}</p>
        )}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Ad / Soyad */}
      <div className="grid grid-cols-2 gap-4">
        {field('firstName', 'Ad', 'text', true)}
        {field('lastName', 'Soyad', 'text', true)}
      </div>

      {/* Telefon / E-posta */}
      <div className="grid grid-cols-2 gap-4">
        {field('phone', 'Telefon', 'tel')}
        {field('email', 'E-posta', 'email')}
      </div>

      {/* Milliyet */}
      {field('nationality', 'Milliyet')}

      {/* Pasaport */}
      <div className="grid grid-cols-2 gap-4">
        {field('passportNumber', 'Pasaport No')}
        {field('passportSeries', 'Pasaport Serisi')}
      </div>

      {/* Doğum tarihi */}
      {field('dateOfBirth', 'Doğum Tarihi', 'date')}

      {/* Adres */}
      <div>
        <label style={labelStyle}>Adres</label>
        <textarea
          name="address"
          disabled={isPending}
          rows={2}
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Notlar */}
      <div>
        <label style={labelStyle}>Notlar</label>
        <textarea
          name="notes"
          disabled={isPending}
          rows={2}
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {state.error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#450A0A', color: '#FCA5A5', border: '1px solid #991B1B' }}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
      >
        {isPending ? 'Kaydediliyor…' : 'Misafiri Kaydet'}
      </button>
    </form>
  )
}
