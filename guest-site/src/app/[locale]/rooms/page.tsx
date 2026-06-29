import { setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ locale: string }> }

export default async function RoomsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const { data: roomTypeData } = await supabase
    .from('room_types')
    .select('name, base_price')

  const byName = (name: string, fallback: number) =>
    Number(roomTypeData?.find((rt) => rt.name === name)?.base_price ?? fallback)

  const prices = {
    standard: byName('Standart', 350000),
    luxury: byName('Lüks', 600000),
    mansard: byName('Delüks', 850000),
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Page header */}
        <section
          style={{
            background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #2a2018 100%)',
            padding: '4rem var(--spacing-container) 3rem',
          }}
        >
          <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
            <RoomsHeader locale={locale} />
            <div className="mt-8 max-w-3xl">
              <BookingWidget />
            </div>
          </div>
        </section>

        {/* Rooms list */}
        <section
          style={{
            backgroundColor: 'var(--color-cream)',
            padding: 'var(--spacing-section) var(--spacing-container)',
          }}
        >
          <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
            <RoomsList locale={locale} prices={prices} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function RoomsHeader({ locale }: { locale: string }) {
  const t = useTranslations('rooms')
  return (
    <div>
      <p
        style={{
          color: 'var(--color-gold)',
          fontSize: 'var(--text-xs)',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: '0.75rem',
        }}
      >
        {locale === 'uz' ? 'Barcha xonalar' : locale === 'ru' ? 'Все номера' : 'All Rooms'}
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-white)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: '700',
        }}
      >
        {t('title')}
      </h1>
    </div>
  )
}

const roomMeta = [
  {
    key: 'standard' as const,
    floor: -1,
    maxOccupancy: 2,
    area: 22,
    amenities: [
      { icon: '📶', label: 'WiFi' },
      { icon: '📺', label: 'TV' },
      { icon: '❄️', label: 'A/C' },
      { icon: '🚿', label: 'Shower' },
    ],
    gradient: 'linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)',
    count: 4,
  },
  {
    key: 'luxury' as const,
    floor: 2,
    maxOccupancy: 2,
    area: 35,
    amenities: [
      { icon: '📶', label: 'WiFi' },
      { icon: '📺', label: 'TV' },
      { icon: '❄️', label: 'A/C' },
      { icon: '🛁', label: 'Bathtub' },
      { icon: '🍾', label: 'Minibar' },
      { icon: '🛎', label: 'Room service' },
    ],
    gradient: 'linear-gradient(135deg, #3a2e1e 0%, #2a2018 100%)',
    count: 4,
  },
  {
    key: 'mansard' as const,
    floor: 4,
    maxOccupancy: 2,
    area: 42,
    amenities: [
      { icon: '📶', label: 'WiFi' },
      { icon: '📺', label: 'TV' },
      { icon: '❄️', label: 'A/C' },
      { icon: '🛁', label: 'Bathtub' },
      { icon: '🍾', label: 'Minibar' },
      { icon: '🛎', label: 'Room service' },
      { icon: '🏙', label: 'Panoramic view' },
      { icon: '🛋', label: 'Bathrobe' },
    ],
    gradient: 'linear-gradient(135deg, #2a1e0e 0%, #1c1208 100%)',
    count: 3,
  },
]

function RoomsList({ locale, prices }: { locale: string; prices: Record<string, number> }) {
  const t = useTranslations('rooms')

  const floorLabel = (floor: number) => {
    if (floor < 0) return locale === 'uz' ? 'Yer osti (-1 qavat)' : locale === 'ru' ? 'Подвальный (-1 этаж)' : 'Basement (-1F)'
    return locale === 'uz' ? `${floor}-qavat` : locale === 'ru' ? `${floor} этаж` : `Floor ${floor}`
  }

  return (
    <div className="flex flex-col gap-8">
      {roomMeta.map((room) => (
        <div
          key={room.key}
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--color-cream-dark)',
          }}
          className="grid grid-cols-1 md:grid-cols-5"
        >
          {/* Image placeholder — 2 cols */}
          <div
            style={{
              background: room.gradient,
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '1.25rem',
            }}
            className="md:col-span-2"
          >
            <span
              style={{
                backgroundColor: 'rgba(201,169,110,0.2)',
                border: '1px solid rgba(201,169,110,0.4)',
                color: 'var(--color-gold-light)',
                fontSize: 'var(--text-xs)',
                fontWeight: '600',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                display: 'inline-block',
                letterSpacing: '0.05em',
              }}
            >
              {floorLabel(room.floor)}
            </span>
          </div>

          {/* Info — 3 cols */}
          <div style={{ padding: '1.75rem' }} className="md:col-span-3 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--color-text-primary)',
                    fontWeight: '700',
                  }}
                >
                  {t(`types.${room.key}`)}
                </h2>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{t('from')}</p>
                  <p style={{ color: 'var(--color-gold-dark)', fontWeight: '800', fontSize: 'var(--text-xl)' }}>
                    {new Intl.NumberFormat().format(prices[room.key])}{' '}
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}>UZS</span>
                  </p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>/ {t('perNight')}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-2 mb-4">
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  👤 {locale === 'uz' ? `${room.maxOccupancy} kishi` : locale === 'ru' ? `${room.maxOccupancy} чел.` : `${room.maxOccupancy} guests`}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  📐 {room.area} m²
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  🛏 {locale === 'uz' ? `${room.count} ta xona` : locale === 'ru' ? `${room.count} номера` : `${room.count} rooms`}
                </span>
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((a) => (
                  <span
                    key={a.label}
                    style={{
                      backgroundColor: 'var(--color-cream)',
                      border: '1px solid var(--color-cream-dark)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--text-xs)',
                      padding: '0.3rem 0.7rem',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {a.icon} {a.label}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA butonlar */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href={`/${locale}/rooms/${room.key}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'transparent',
                  color: 'var(--color-gold-dark)',
                  border: '1.5px solid var(--color-gold)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                  fontSize: 'var(--text-sm)',
                  transition: 'var(--transition-fast)',
                  alignSelf: 'flex-start',
                }}
                className="hover:opacity-80"
              >
                {t('viewDetails')}
              </Link>
              <Link
                href={`/${locale}/book?roomType=${room.key}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--color-gold)',
                  color: 'var(--color-white)',
                  padding: '0.75rem 1.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '700',
                  fontSize: 'var(--text-sm)',
                  transition: 'var(--transition-fast)',
                  alignSelf: 'flex-start',
                  boxShadow: 'var(--shadow-gold)',
                }}
                className="hover:opacity-90"
              >
                {t('bookNow')} →
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
