'use client'

import Link from 'next/link'
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
    submit: "So'rov yuborish",
    submitting: 'Yuborilmoqda…',
    success: "So'rovingiz qabul qilindi! Tez orada siz bilan bog'lanamiz.",
    perNight: '/kecha',
    roomNames: {
      standard: 'Standart xona',
      luxury: 'Lyuks xona',
      mansard: 'Mansard lyuks',
    },
    step1: 'Xona va muddat',
    step2: 'Sizning ma\'lumotlaringiz',
    step3: 'Maxsus so\'rov',
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
    perNight: '/ночь',
    roomNames: {
      standard: 'Стандартный номер',
      luxury: 'Люкс',
      mansard: 'Мансардный люкс',
    },
    step1: 'Номер и даты',
    step2: 'Ваши данные',
    step3: 'Особые пожелания',
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
    success: "Your request has been received! We'll get back to you soon.",
    perNight: '/night',
    roomNames: {
      standard: 'Standard Room',
      luxury: 'Luxury Room',
      mansard: 'Mansard Luxury',
    },
    step1: 'Room & Dates',
    step2: 'Your Details',
    step3: 'Special Requests',
  },
}

type RoomPrices = { standard: number; luxury: number; mansard: number }

type Props = {
  locale: string
  roomPrices: RoomPrices
  defaultRoomType?: string
  defaultCheckIn?: string
  defaultCheckOut?: string
  defaultAdults?: string
}

function StepDivider({ number, label }: { number: number; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        paddingTop: '0.5rem',
      }}
    >
      <span
        style={{
          width: '1.75rem',
          height: '1.75rem',
          borderRadius: '50%',
          backgroundColor: 'var(--color-gold)',
          color: 'var(--color-white)',
          fontSize: '0.7rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {number}
      </span>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: '1px',
          backgroundColor: 'var(--color-cream-dark)',
        }}
      />
    </div>
  )
}

export default function BookingForm({
  locale,
  roomPrices,
  defaultRoomType,
  defaultCheckIn,
  defaultCheckOut,
  defaultAdults,
}: Props) {
  const l = labels[locale as keyof typeof labels] ?? labels.uz
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const validRoomType = ['standard', 'luxury', 'mansard'].includes(defaultRoomType ?? '')
    ? (defaultRoomType as 'standard' | 'luxury' | 'mansard')
    : 'standard'

  const checkIn = defaultCheckIn || today
  const checkOut = defaultCheckOut || tomorrow
  const adults = defaultAdults || '2'

  const fmt = (n: number) => new Intl.NumberFormat().format(n)

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
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: '0.25rem' }}>
              {locale === 'uz' ? 'Buyurtma kodi' : locale === 'ru' ? 'Код бронирования' : 'Booking Code'}
            </p>
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
                letterSpacing: '0.1em',
              }}
            >
              {state.reservationCode}
            </p>
          </div>
        )}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {state.reservationCode && (
            <Link
              href={`/${locale}/pay/${state.reservationCode}`}
              style={{
                backgroundColor: 'var(--color-gold)',
                color: 'var(--color-white)',
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: 'var(--text-base)',
                display: 'inline-block',
                boxShadow: 'var(--shadow-gold)',
              }}
            >
              {locale === 'uz' ? '💳 Hozir to\'lash' : locale === 'ru' ? '💳 Оплатить сейчас' : '💳 Pay Now'}
            </Link>
          )}
          <Link
            href={`/${locale}`}
            style={{
              backgroundColor: 'var(--color-charcoal)',
              color: 'var(--color-white)',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              fontSize: 'var(--text-sm)',
              display: 'inline-block',
            }}
          >
            {locale === 'uz' ? 'Bosh sahifaga' : locale === 'ru' ? 'На главную' : 'Go Home'}
          </Link>
        </div>
      </div>
    )
  }

  const inputStyle = {
    border: '1.5px solid var(--color-cream-dark)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 1rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-white)',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 'var(--text-xs)',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.4rem',
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
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* ── Step 1: Room & Dates ── */}
      <StepDivider number={1} label={l.step1} />

      {/* Room type */}
      <div>
        <label style={labelStyle}>{l.roomType} *</label>
        <select
          name="roomType"
          required
          disabled={isPending}
          defaultValue={validRoomType}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {(['standard', 'luxury', 'mansard'] as const).map((key) => (
            <option key={key} value={key}>
              {l.roomNames[key]} — {fmt(roomPrices[key])} UZS{l.perNight}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>{l.checkIn} *</label>
          <input
            name="checkIn"
            type="date"
            min={today}
            defaultValue={checkIn}
            required
            disabled={isPending}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{l.checkOut} *</label>
          <input
            name="checkOut"
            type="date"
            min={tomorrow}
            defaultValue={checkOut}
            required
            disabled={isPending}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Adults */}
      <div style={{ maxWidth: '8rem' }}>
        <label style={labelStyle}>{l.adults} *</label>
        <select
          name="adults"
          defaultValue={adults}
          required
          disabled={isPending}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* ── Step 2: Personal Info ── */}
      <StepDivider number={2} label={l.step2} />

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
          <input
            name="phone"
            type="tel"
            required
            disabled={isPending}
            placeholder="+998 XX XXX XX XX"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{l.email}</label>
          <input name="email" type="email" disabled={isPending} style={inputStyle} />
        </div>
      </div>

      {/* ── Step 3: Special Requests ── */}
      <StepDivider number={3} label={l.step3} />

      <div>
        <textarea
          name="specialRequests"
          disabled={isPending}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder={
            locale === 'uz'
              ? 'Ixtiyoriy…'
              : locale === 'ru'
              ? 'Необязательно…'
              : 'Optional…'
          }
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
          padding: '1rem',
          fontWeight: '700',
          fontSize: 'var(--text-base)',
          transition: 'var(--transition-fast)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          boxShadow: isPending ? 'none' : 'var(--shadow-gold)',
          marginTop: '0.5rem',
          border: 'none',
          width: '100%',
        }}
        className="hover:opacity-90"
      >
        {isPending ? l.submitting : l.submit}
      </button>
    </form>
  )
}
