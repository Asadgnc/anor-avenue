import Link from 'next/link'

type Props = {
  locale: string
  isPaid: boolean
}

const labels = {
  uz: {
    title: "To'lov mehmonxonada olinadi",
    desc: "To'lov siz kelganingizda, kirishda (oldindan) — naqd pul yoki bank kartasi orqali qabul qilinadi. Onlayn to'lov talab qilinmaydi.",
    contact: "Administratorimiz buyurtmangizni tasdiqlash uchun tez orada siz bilan bog'lanadi.",
    goHome: 'Bosh sahifaga',
    alreadyPaid: 'Bu buyurtma allaqachon tasdiqlangan.',
  },
  ru: {
    title: 'Оплата производится в отеле',
    desc: 'Оплата принимается при заезде (предоплата) — наличными или банковской картой. Онлайн-оплата не требуется.',
    contact: 'Наш администратор свяжется с вами в ближайшее время для подтверждения бронирования.',
    goHome: 'На главную',
    alreadyPaid: 'Это бронирование уже подтверждено.',
  },
  en: {
    title: 'Payment is taken at the hotel',
    desc: 'Payment is collected at check-in (in advance) — by cash or bank card. No online payment is required.',
    contact: 'Our team will contact you shortly to confirm your booking.',
    goHome: 'Go Home',
    alreadyPaid: 'This reservation has already been confirmed.',
  },
}

export default function PaymentOptions({ locale, isPaid }: Props) {
  const l = labels[locale as keyof typeof labels] ?? labels.uz

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

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        textAlign: 'center',
        border: '1px solid var(--color-cream-dark)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏨</div>
      <h2
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: '700',
          color: 'var(--color-text-primary)',
          marginBottom: '0.75rem',
        }}
      >
        {l.title}
      </h2>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.6,
          marginBottom: '0.75rem',
        }}
      >
        {l.desc}
      </p>
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.6,
          marginBottom: '1.5rem',
        }}
      >
        {l.contact}
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
