'use client'

import { useActionState } from 'react'
import { submitBookingInquiry, type BookingInquiryState } from '@/app/[locale]/book/actions'

const initialState: BookingInquiryState = {}

const labels = {
  uz: {
    firstName: 'Ism',
    lastName: 'Familiya',
    phone: 'Telefon raqam',
    email: 'Email (ixtiyoriy)',
    roomType: 'Xona turi',
    checkIn: 'Kelish sanasi',
    checkOut: 'Ketish sanasi',
    adults: 'Kattalar soni',
    requests: 'Maxsus xohishlar (ixtiyoriy)',
    submit: 'So\'rov yuborish',
    submitting: 'Yuborilmoqda…',
    success: 'So\'rovingiz qabul qilindi! Tez orada siz bilan bog\'lanamiz.',
    roomTypes: {
      standard: 'Standart xona — 350,000 UZS/kecha',
      luxury: 'Lyuks xona — 600,000 UZS/kecha',
      mansard: 'Mansard lyuks — 850,000 UZS/kecha',
    },
  },
  ru: {
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Номер телефона',
    email: 'Email (необязательно)',
    roomType: 'Тип номера',
    checkIn: 'Дата заезда',
    checkOut: 'Дата выезда',
    adults: 'Количество взрослых',
    requests: 'Особые пожелания (необязательно)',
    submit: 'Отправить запрос',
    submitting: 'Отправка…',
    success: 'Ваш запрос принят! Мы свяжемся с вами в ближайшее время.',
    roomTypes: {
      standard: 'Стандартный номер — 350,000 UZS/ночь',
      luxury: 'Люкс — 600,000 UZS/ночь',
      mansard: 'Мансардный люкс — 850,000 UZS/ночь',
    },
  },
  en: {
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone Number',
    email: 'Email (optional)',
    roomType: 'Room Type',
    checkIn: 'Check-in Date',
    checkOut: 'Check-out Date',
    adults: 'Number of Adults',
    requests: 'Special Requests (optional)',
    submit: 'Send Request',
    submitting: 'Sending…',
    success: 'Your request has been received! We\'ll get back to you soon.',
    roomTypes: {
      standard: 'Standard Room — 350,000 UZS/night',
      luxury: 'Luxury Room — 600,000 UZS/night',
      mansard: 'Mansard Luxury — 850,000 UZS/night',
    },
  },
}

type Props = { locale: string }

export default function BookingForm({ locale }: Props) {
  const l = labels[locale as keyof typeof labels] ?? labels.uz
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const boundAction = submitBookingInquiry.bind(null, locale)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  if (state.success) {
    return (
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '2px solid var(--color-gold)',
          boxShadow: 'var(--shadow-gold)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <p
          style={{
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-lg)',
            fontWeight: '600',
            marginBottom: '0.75rem',
          }}
        >
          {l.success}
        </p>
        {state.reservationCode && (
          <p
            style={{
              backgroundColor: 'var(--color-cream)',
              border: '1px solid var(--color-gold)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.5rem',
              fontFamily: 'monospace',
              fontSize: 'var(--text-xl)',
              fontWeight: '800',
              color: 'var(--color-gold-dark)',
              display: 'inline-block',
              marginTop: '0.5rem',
              letterSpacing: '0.1em',
            }}
          >
            {state.reservationCode}
          </p>
        )}
      </div>
    )
  }

  const inputStyle = {
    border: '1px solid var(--color-cream-dark)',
    borderRadius: 'var(--radius-md)',
    padding: '0.625rem 0.875rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-white)',
    width: '100%',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.375rem',
  }

  return (
    <form
      action={action}
      style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--color-cream-dark)',
      }}
      className="flex flex-col gap-5"
    >
      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>{l.firstName} *</label>
          <input name="firstName" required disabled={isPending} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{l.lastName} *</label>
          <input name="lastName" required disabled={isPending} style={inputStyle} />
        </div>
      </div>

      {/* Phone + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>{l.phone} *</label>
          <input name="phone" type="tel" required disabled={isPending} placeholder="+998 XX XXX XX XX" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{l.email}</label>
          <input name="email" type="email" disabled={isPending} style={inputStyle} />
        </div>
      </div>

      {/* Room type */}
      <div>
        <label style={labelStyle}>{l.roomType} *</label>
        <select name="roomType" required disabled={isPending} style={inputStyle}>
          <option value="standard">{l.roomTypes.standard}</option>
          <option value="luxury">{l.roomTypes.luxury}</option>
          <option value="mansard">{l.roomTypes.mansard}</option>
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>{l.checkIn} *</label>
          <input name="checkIn" type="date" min={today} defaultValue={today} required disabled={isPending} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{l.checkOut} *</label>
          <input name="checkOut" type="date" min={tomorrow} defaultValue={tomorrow} required disabled={isPending} style={inputStyle} />
        </div>
      </div>

      {/* Adults */}
      <div className="w-32">
        <label style={labelStyle}>{l.adults} *</label>
        <select name="adults" defaultValue="2" required disabled={isPending} style={inputStyle}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Special requests */}
      <div>
        <label style={labelStyle}>{l.requests}</label>
        <textarea
          name="specialRequests"
          disabled={isPending}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Error */}
      {state.error && (
        <p
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.875rem',
            fontSize: 'var(--text-sm)',
          }}
        >
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          backgroundColor: isPending ? 'var(--color-stone)' : 'var(--color-gold)',
          color: 'var(--color-white)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem',
          fontWeight: '700',
          fontSize: 'var(--text-base)',
          transition: 'var(--transition-fast)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          boxShadow: isPending ? 'none' : 'var(--shadow-gold)',
        }}
        className="hover:opacity-90"
      >
        {isPending ? l.submitting : l.submit}
      </button>
    </form>
  )
}
