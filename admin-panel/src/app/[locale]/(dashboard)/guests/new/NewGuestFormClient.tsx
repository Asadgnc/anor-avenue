'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createGuestAction, type GuestFormState } from './actions'

export default function NewGuestFormClient() {
  const router = useRouter()
  const [state, action, isPending] = useActionState<GuestFormState, FormData>(createGuestAction, {})

  // Başarı → misafir detay sayfasına yönlendir
  useEffect(() => {
    if (state.guestId) {
      router.push(`/guests/${state.guestId}`)
    }
  }, [state.guestId, router])

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]'
  const inputStyle = { backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }
  const labelStyle: React.CSSProperties = {
    color: 'var(--color-admin-muted)',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: '0.375rem',
  }

  function field(name: string, label: string, type = 'text', required = false) {
    const hasError = !!state.fieldErrors?.[name]
    return (
      <div>
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: '#EF4444' }}> *</span>}
        </label>
        <input
          name={name}
          type={type}
          required={required}
          disabled={isPending}
          className={inputClass}
          style={{ ...inputStyle, borderColor: hasError ? '#EF4444' : 'var(--color-admin-border)' }}
        />
        {hasError && (
          <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
            {state.fieldErrors![name]}
          </p>
        )}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('firstName', 'Ad', 'text', true)}
        {field('lastName', 'Soyad', 'text', true)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('phone', 'Telefon', 'tel')}
        {field('email', 'E-posta', 'email')}
      </div>

      {field('nationality', 'Milliyet')}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('passportNumber', 'Pasaport No')}
        {field('passportSeries', 'Pasaport Serisi')}
      </div>

      {field('dateOfBirth', 'Doğum Tarihi', 'date')}

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
        <div
          className="text-sm px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: '#FDEAEA', color: '#EF4444', border: '1px solid #EF4444' }}
        >
          ⚠ {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !!state.guestId}
        className="py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
      >
        {isPending ? 'Kaydediliyor…' : state.guestId ? 'Yönlendiriliyor…' : 'Misafiri Kaydet'}
      </button>
    </form>
  )
}
