'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  locale: string
  reservationId: string
  isPaid: boolean
}

const labels = {
  uz: {
    choose: 'To\'lov usulini tanlang',
    payme: 'Payme orqali to\'lash',
    click: 'Click orqali to\'lash',
    uzum: 'Uzum Bank orqali to\'lash',
    cash: 'Naqd pul (mehmonxonada)',
    comingSoon: 'Tez orada — merchant hisob raqami tasdiqlanmoqda',
    cashTitle: 'Naqd pul',
    cashDesc: 'Mehmonxonaga kelganingizda to\'laysiz. Administratorimiz siz bilan bog\'lanadi.',
    cashConfirm: 'Naqd pul bilan to\'layman',
    cashSuccess: 'Tanlov qabul qilindi! Tez orada administratorimiz siz bilan bog\'lanadi.',
    goHome: 'Bosh sahifaga',
    alreadyPaid: 'Bu buyurtma allaqachon tasdiqlangan.',
  },
  ru: {
    choose: 'Выберите способ оплаты',
    payme: 'Оплатить через Payme',
    click: 'Оплатить через Click',
    uzum: 'Оплатить через Uzum Bank',
    cash: 'Наличными (в отеле)',
    comingSoon: 'Скоро — идёт подключение платёжного шлюза',
    cashTitle: 'Наличные',
    cashDesc: 'Оплачиваете при заезде. Наш администратор свяжется с вами для подтверждения.',
    cashConfirm: 'Оплачу наличными',
    cashSuccess: 'Выбор принят! Наш администратор свяжется с вами в ближайшее время.',
    goHome: 'На главную',
    alreadyPaid: 'Это бронирование уже подтверждено.',
  },
  en: {
    choose: 'Choose payment method',
    payme: 'Pay with Payme',
    click: 'Pay with Click',
    uzum: 'Pay with Uzum Bank',
    cash: 'Cash (at hotel)',
    comingSoon: 'Coming soon — payment gateway is being set up',
    cashTitle: 'Cash',
    cashDesc: 'Pay at the hotel upon arrival. Our admin will contact you to confirm your booking.',
    cashConfirm: 'I\'ll pay with cash',
    cashSuccess: 'Choice received! Our admin will contact you shortly.',
    goHome: 'Go Home',
    alreadyPaid: 'This reservation has already been confirmed.',
  },
}

export default function PaymentOptions({ locale, isPaid }: Props) {
  const l = labels[locale as keyof typeof labels] ?? labels.uz
  const [selected, setSelected] = useState<'payme' | 'click' | 'uzum' | 'cash' | null>(null)
  const [cashConfirmed, setCashConfirmed] = useState(false)

  if (isPaid) {
    return (
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
          border: '2px solid #22c55e',
          boxShadow: '0 0 0 4px rgba(34,197,94,0.1)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
        <p style={{ color: '#15803d', fontWeight: '600' }}>{l.alreadyPaid}</p>
      </div>
    )
  }

  if (cashConfirmed) {
    return (
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          border: '2px solid var(--color-gold)',
          boxShadow: 'var(--shadow-gold)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <p
          style={{
            color: 'var(--color-text-primary)',
            fontWeight: '600',
            fontSize: 'var(--text-lg)',
            marginBottom: '1.5rem',
          }}
        >
          {l.cashSuccess}
        </p>
        <Link
          href={`/${locale}`}
          style={{
            backgroundColor: 'var(--color-charcoal)',
            color: 'var(--color-white)',
            padding: '0.625rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: '600',
            fontSize: 'var(--text-sm)',
            display: 'inline-block',
          }}
        >
          {l.goHome}
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p
        style={{
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontWeight: '600',
          fontSize: 'var(--text-sm)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {l.choose}
      </p>

      {/* Payme */}
      <PaymentCard
        selected={selected === 'payme'}
        onSelect={() => setSelected(selected === 'payme' ? null : 'payme')}
        logo="🟦"
        name="Payme"
        label={l.payme}
        comingSoon
        comingSoonText={l.comingSoon}
        accentColor="#0082FF"
      />

      {/* Click */}
      <PaymentCard
        selected={selected === 'click'}
        onSelect={() => setSelected(selected === 'click' ? null : 'click')}
        logo="🟩"
        name="Click"
        label={l.click}
        comingSoon
        comingSoonText={l.comingSoon}
        accentColor="#22c55e"
      />

      {/* Uzum */}
      <PaymentCard
        selected={selected === 'uzum'}
        onSelect={() => setSelected(selected === 'uzum' ? null : 'uzum')}
        logo="🟣"
        name="Uzum Bank"
        label={l.uzum}
        comingSoon
        comingSoonText={l.comingSoon}
        accentColor="#7c3aed"
      />

      {/* Cash */}
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: selected === 'cash' ? '2px solid var(--color-gold)' : '1px solid var(--color-cream-dark)',
          boxShadow: selected === 'cash' ? 'var(--shadow-gold)' : 'var(--shadow-card)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        <button
          onClick={() => setSelected(selected === 'cash' ? null : 'cash')}
          style={{
            width: '100%',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.75rem' }}>💵</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)', margin: 0 }}>
              {l.cashTitle}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0.125rem 0 0' }}>
              {l.cash}
            </p>
          </div>
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: `2px solid ${selected === 'cash' ? 'var(--color-gold)' : 'var(--color-cream-dark)'}`,
              backgroundColor: selected === 'cash' ? 'var(--color-gold)' : 'transparent',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          />
        </button>

        {selected === 'cash' && (
          <div
            style={{
              padding: '0 1.5rem 1.5rem',
              borderTop: '1px solid var(--color-cream-dark)',
            }}
          >
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: '1rem', marginTop: '1rem' }}>
              {l.cashDesc}
            </p>
            <button
              onClick={() => setCashConfirmed(true)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-gold)',
                color: 'var(--color-white)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontWeight: '700',
                fontSize: 'var(--text-base)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-gold)',
              }}
            >
              {l.cashConfirm}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentCard({
  selected,
  onSelect,
  logo,
  name,
  label,
  comingSoon,
  comingSoonText,
  accentColor,
}: {
  selected: boolean
  onSelect: () => void
  logo: string
  name: string
  label: string
  comingSoon?: boolean
  comingSoonText?: string
  accentColor: string
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: selected ? `2px solid ${accentColor}` : '1px solid var(--color-cream-dark)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        opacity: comingSoon ? 0.7 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      <button
        onClick={onSelect}
        disabled={comingSoon}
        style={{
          width: '100%',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'none',
          border: 'none',
          cursor: comingSoon ? 'not-allowed' : 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1.75rem' }}>{logo}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', fontSize: 'var(--text-base)', margin: 0 }}>
            {name}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0.125rem 0 0' }}>
            {label}
          </p>
        </div>
        {comingSoon ? (
          <span
            style={{
              backgroundColor: '#fef9c3',
              color: '#a16207',
              fontSize: '0.65rem',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            soon
          </span>
        ) : (
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: `2px solid ${selected ? accentColor : 'var(--color-cream-dark)'}`,
              backgroundColor: selected ? accentColor : 'transparent',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          />
        )}
      </button>

      {comingSoon && selected && (
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          <p style={{ color: '#a16207', fontSize: 'var(--text-sm)', margin: 0 }}>{comingSoonText}</p>
        </div>
      )}
    </div>
  )
}
