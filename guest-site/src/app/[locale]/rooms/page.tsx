import { setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'
import { supabase } from '@/lib/supabase'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string }>
}

const ROOM_TYPE_NAMES: Record<string, string> = {
  standard: 'Standart',
  luxury: 'Lüks',
  mansard: 'Delüks',
}

async function checkAvailability(
  checkIn: string,
  checkOut: string
): Promise<Record<string, { available: number; total: number }>> {
  // Tüm oda tiplerini çek
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, name')

  if (!roomTypes) return {}

  const result: Record<string, { available: number; total: number }> = {}

  await Promise.all(
    roomTypes.map(async (rt) => {
      const key = Object.entries(ROOM_TYPE_NAMES).find(([, v]) => v === rt.name)?.[0]
      if (!key) return

      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_type_id', rt.id)
        .eq('is_active', true)

      if (!rooms || rooms.length === 0) {
        result[key] = { available: 0, total: 0 }
        return
      }

      const roomIds = rooms.map((r) => r.id)

      const { data: conflicts } = await supabase
        .from('reservations')
        .select('room_id')
        .in('room_id', roomIds)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .lt('check_in', checkOut)
        .gt('check_out', checkIn)

      const conflictSet = new Set((conflicts ?? []).map((c) => c.room_id as string))
      const available = rooms.filter((r) => !conflictSet.has(r.id)).length

      result[key] = { available, total: rooms.length }
    })
  )

  return result
}

export default async function RoomsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { checkIn, checkOut, adults } = await searchParams
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

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const hasValidDates =
    checkIn && checkOut &&
    checkIn >= today &&
    checkOut > checkIn

  const availability = hasValidDates
    ? await checkAvailability(checkIn!, checkOut!)
    : null

  const nights = hasValidDates
    ? Math.round(
        (new Date(checkOut!).getTime() - new Date(checkIn!).getTime()) / 86400000
      )
    : null

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
              <BookingWidget
                defaultCheckIn={checkIn || today}
                defaultCheckOut={checkOut || tomorrow}
                defaultAdults={adults ? Number(adults) : 2}
              />
            </div>
          </div>
        </section>

        {/* Seçilen tarih bilgisi */}
        {hasValidDates && (
          <div
            style={{
              backgroundColor: 'rgba(201,169,110,0.1)',
              borderBottom: '1px solid rgba(201,169,110,0.2)',
              padding: '0.875rem var(--spacing-container)',
            }}
          >
            <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
              <p style={{ color: 'var(--color-gold-dark)', fontSize: 'var(--text-sm)', fontWeight: '600' }}>
                {locale === 'uz'
                  ? `${checkIn} — ${checkOut} · ${nights} kecha · ${adults || 2} kishi uchun mavjud xonalar:`
                  : locale === 'ru'
                  ? `${checkIn} — ${checkOut} · ${nights} ночей · Доступные номера для ${adults || 2} гостей:`
                  : `${checkIn} — ${checkOut} · ${nights} nights · Available rooms for ${adults || 2} guests:`}
              </p>
            </div>
          </div>
        )}

        {/* Rooms list */}
        <section
          style={{
            backgroundColor: 'var(--color-cream)',
            padding: 'var(--spacing-section) var(--spacing-container)',
          }}
        >
          <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
            <RoomsList
              locale={locale}
              prices={prices}
              availability={availability}
              checkIn={checkIn}
              checkOut={checkOut}
              adults={adults}
            />
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
    photo: '/hotel-photos/some-delicious-meal-bed-bedroom-side-view.jpg',
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
    photo: '/hotel-photos/3d-rendering-beautiful-comtemporary-luxury-bedroom-suite-hotel-with-tv.jpg',
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
    photo: '/hotel-photos/woman-laying-bed-enjoys-breakfast-tray-hotel-room.jpg',
    count: 3,
  },
]

function AvailabilityBadge({
  avail,
  locale,
}: {
  avail: { available: number; total: number } | undefined
  locale: string
}) {
  if (!avail) return null

  if (avail.available === 0) {
    return (
      <span
        style={{
          backgroundColor: '#450A0A',
          color: '#FCA5A5',
          fontSize: 'var(--text-xs)',
          fontWeight: '700',
          padding: '0.3rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          display: 'inline-block',
        }}
      >
        {locale === 'uz' ? 'To\'liq' : locale === 'ru' ? 'Занято' : 'Sold out'}
      </span>
    )
  }

  if (avail.available <= 1) {
    return (
      <span
        style={{
          backgroundColor: '#451A03',
          color: '#FCD34D',
          fontSize: 'var(--text-xs)',
          fontWeight: '700',
          padding: '0.3rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          display: 'inline-block',
        }}
      >
        {locale === 'uz'
          ? `Faqat ${avail.available} ta qoldi`
          : locale === 'ru'
          ? `Осталось ${avail.available}`
          : `Only ${avail.available} left`}
      </span>
    )
  }

  return (
    <span
      style={{
        backgroundColor: '#14532D',
        color: '#86EFAC',
        fontSize: 'var(--text-xs)',
        fontWeight: '700',
        padding: '0.3rem 0.75rem',
        borderRadius: 'var(--radius-full)',
        display: 'inline-block',
      }}
    >
      {locale === 'uz'
        ? `${avail.available} ta xona bo'sh`
        : locale === 'ru'
        ? `${avail.available} номера свободно`
        : `${avail.available} rooms available`}
    </span>
  )
}

function RoomsList({
  locale,
  prices,
  availability,
  checkIn,
  checkOut,
  adults,
}: {
  locale: string
  prices: Record<string, number>
  availability: Record<string, { available: number; total: number }> | null
  checkIn?: string
  checkOut?: string
  adults?: string
}) {
  const t = useTranslations('rooms')

  const floorLabel = (floor: number) => {
    if (floor < 0) return locale === 'uz' ? 'Yer osti (-1 qavat)' : locale === 'ru' ? 'Подвальный (-1 этаж)' : 'Basement (-1F)'
    return locale === 'uz' ? `${floor}-qavat` : locale === 'ru' ? `${floor} этаж` : `Floor ${floor}`
  }

  const bookHref = (key: string) => {
    const params = new URLSearchParams({ roomType: key })
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    if (adults) params.set('adults', adults)
    return `/${locale}/book?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-8">
      {roomMeta.map((room) => {
        const avail = availability?.[room.key]
        const isSoldOut = avail !== undefined && avail.available === 0

        return (
          <div
            key={room.key}
            style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
              border: isSoldOut
                ? '1px solid #991B1B'
                : avail && avail.available > 0
                ? '2px solid #16A34A'
                : '1px solid var(--color-cream-dark)',
              opacity: isSoldOut ? 0.7 : 1,
            }}
            className="grid grid-cols-1 md:grid-cols-5"
          >
            {/* Room photo — 2 cols */}
            <div
              style={{
                position: 'relative',
                minHeight: '220px',
                overflow: 'hidden',
              }}
              className="md:col-span-2"
            >
              <Image
                src={room.photo}
                alt={room.key}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 40vw"
                quality={80}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.25rem',
                  left: '1.25rem',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
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
                {availability && <AvailabilityBadge avail={avail} locale={locale} />}
              </div>
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
                {!isSoldOut && (
                  <Link
                    href={bookHref(room.key)}
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
                )}
                {isSoldOut && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.75rem 1.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: '600',
                      color: '#6B7280',
                      backgroundColor: '#1F2937',
                      cursor: 'not-allowed',
                    }}
                  >
                    {locale === 'uz' ? 'Mavjud emas' : locale === 'ru' ? 'Недоступно' : 'Unavailable'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
