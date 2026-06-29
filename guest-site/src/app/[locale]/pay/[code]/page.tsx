import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import PaymentOptions from './PaymentOptions'
import { createServiceClient } from '@/lib/supabase'

type Props = { params: Promise<{ locale: string; code: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const title =
    locale === 'uz' ? 'To\'lov — Anor Avenue' : locale === 'ru' ? 'Оплата — Anor Avenue' : 'Payment — Anor Avenue'
  return { title }
}

export default async function PaymentPage({ params }: Props) {
  const { locale, code } = await params
  setRequestLocale(locale)

  const service = createServiceClient()

  const { data: reservation } = await service
    .from('reservations')
    .select(`
      id,
      reservation_code,
      check_in,
      check_out,
      total_amount,
      currency,
      status,
      guests ( first_name, last_name ),
      rooms ( room_number, room_types ( name ) )
    `)
    .eq('reservation_code', code)
    .single()

  if (!reservation) notFound()

  const guest = reservation.guests as unknown as { first_name: string; last_name: string } | null
  const room = reservation.rooms as unknown as { room_number: string; room_types: { name: string } | null } | null

  const nights = Math.round(
    (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) / 86400000
  )

  const summary = {
    code: reservation.reservation_code,
    guestName: guest ? `${guest.first_name} ${guest.last_name}` : '—',
    roomNumber: room?.room_number ?? '—',
    roomType: room?.room_types?.name ?? '—',
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    nights,
    totalAmount: Number(reservation.total_amount),
    currency: reservation.currency,
    status: reservation.status,
  }

  const isPaid = ['confirmed', 'checked_in', 'checked_out'].includes(reservation.status)

  return (
    <>
      <Navbar />
      <main
        style={{
          minHeight: '80vh',
          background: 'var(--color-cream)',
          padding: '3rem 1rem',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏨</div>
            <h1
              style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.25rem',
              }}
            >
              {locale === 'uz' ? 'To\'lov' : locale === 'ru' ? 'Оплата' : 'Payment'}
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Anor Avenue Hotel
            </p>
          </div>

          {/* Reservation summary card */}
          <div
            style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--color-cream-dark)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--color-cream-dark)',
              }}
            >
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {locale === 'uz' ? 'Buyurtma kodi' : locale === 'ru' ? 'Код бронирования' : 'Booking Code'}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-gold-dark)',
                  letterSpacing: '0.05em',
                }}
              >
                {summary.code}
              </span>
            </div>

            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                {
                  label: locale === 'uz' ? 'Mehmon' : locale === 'ru' ? 'Гость' : 'Guest',
                  value: summary.guestName,
                },
                {
                  label: locale === 'uz' ? 'Xona' : locale === 'ru' ? 'Номер' : 'Room',
                  value: `${summary.roomNumber} — ${summary.roomType}`,
                },
                {
                  label: locale === 'uz' ? 'Kelish' : locale === 'ru' ? 'Заезд' : 'Check-in',
                  value: summary.checkIn,
                },
                {
                  label: locale === 'uz' ? 'Ketish' : locale === 'ru' ? 'Выезд' : 'Check-out',
                  value: summary.checkOut,
                },
                {
                  label: locale === 'uz' ? 'Tunlar soni' : locale === 'ru' ? 'Ночей' : 'Nights',
                  value: String(summary.nights),
                },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <dt style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{label}</dt>
                  <dd style={{ fontWeight: '500', color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }}>{value}</dd>
                </div>
              ))}
            </dl>

            {/* Total amount */}
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '2px solid var(--color-gold)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {locale === 'uz' ? 'Jami to\'lov' : locale === 'ru' ? 'К оплате' : 'Total Due'}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: '800',
                  color: 'var(--color-gold-dark)',
                }}
              >
                {new Intl.NumberFormat('uz-UZ').format(summary.totalAmount)} {summary.currency}
              </span>
            </div>
          </div>

          {/* Payment options */}
          <PaymentOptions locale={locale} reservationId={reservation.id} isPaid={isPaid} />
        </div>
      </main>
      <Footer />
    </>
  )
}
