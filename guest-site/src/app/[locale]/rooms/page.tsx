import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'
import RoomsFilter from '@/components/hotel/RoomsFilter'
import { supabase, createServiceClient } from '@/lib/supabase'
import { fetchRoomCapacities } from '@/lib/availability'
import { getRoomCover, PHOTO_FALLBACK } from '@/lib/roomPhotos'

type RoomRow = {
  id: string
  room_number: string
  floor: number
  room_type_name: string
  effective_price: number
  view_quality: 'standard' | 'good' | 'premium'
  has_jacuzzi: boolean
  has_bathtub: boolean
  is_isolated: boolean
  connecting_room_id: string | null
  max_occupancy: number
}

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    checkIn?: string
    checkOut?: string
    adults?: string
    sort?: string
    floor?: string
    jacuzzi?: string
    bathtub?: string
  }>
}

const TYPE_SLUG: Record<string, string> = {
  Standard: 'standard',
  Deluxe: 'deluxe',
  Luxury: 'luxury',
}

const TYPE_NAMES: Record<string, Record<string, string>> = {
  standard: { uz: 'Standart xona', ru: 'Стандартный номер', en: 'Standard Room' },
  deluxe:   { uz: 'Delyuks xona',  ru: 'Номер делюкс',      en: 'Deluxe Room' },
  luxury:   { uz: 'Lyuks xona',    ru: 'Номер люкс',        en: 'Luxury Room' },
}

const VIEW_LABELS: Record<string, Record<string, string>> = {
  standard: { uz: 'Standart manzara', ru: 'Стандартный вид', en: 'Standard view' },
  good:     { uz: 'Yaxshi manzara',   ru: 'Хороший вид',     en: 'Good view' },
  premium:  { uz: 'Premium manzara',  ru: 'Панорамный вид',  en: 'Panoramic view' },
}

const FEAT_LABELS: Record<string, Record<string, string>> = {
  jacuzzi:     { uz: 'Jakuzi',           ru: 'Джакузи',            en: 'Jacuzzi' },
  bathtub:     { uz: 'Hammom vannasi',   ru: 'Ванна',               en: 'Bathtub' },
  isolated:    { uz: 'Alohida kirish',   ru: 'Отдельный вход',     en: 'Private entrance' },
  connecting:  { uz: "Qo'shni xona",    ru: 'Смежный номер',       en: 'Connecting room' },
  viewGood:    { uz: 'Yaxshi manzara',   ru: 'Хороший вид',        en: 'Good view' },
  viewPremium: { uz: 'Premium manzara',  ru: 'Панорамный вид',     en: 'Panoramic view' },
}

const VIEW_ORDER: Record<string, number> = { standard: 0, good: 1, premium: 2 }

function floorLabel(floor: number, locale: string): string {
  if (floor < 0) {
    return locale === 'uz' ? "Bog'cha qavati" : locale === 'ru' ? 'Садовый этаж' : 'Garden Floor'
  }
  return locale === 'uz' ? `${floor}-qavat` : locale === 'ru' ? `${floor} этаж` : `Floor ${floor}`
}

export default async function RoomsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { checkIn, checkOut, adults, sort, floor, jacuzzi, bathtub } = await searchParams
  setRequestLocale(locale)

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const { data: allRooms } = await supabase
    .from('rooms_with_effective_price')
    .select(
      'id, room_number, floor, room_type_name, effective_price, view_quality, has_jacuzzi, has_bathtub, is_isolated, connecting_room_id, max_occupancy, is_active'
    )
    .eq('is_active', true)
    .eq('is_public', true)
    .order('room_number')

  const rooms: RoomRow[] = (allRooms ?? []) as RoomRow[]

  // Gerçek per-oda kapasite (channex_variants.occupancy); view'deki max_occupancy
  // oda tipinden gelir ve hepsi 2 döner — bu yüzden ayrıca çekiyoruz.
  const capMap = await fetchRoomCapacities(createServiceClient())
  const roomCapacity = (r: RoomRow) => capMap.get(r.id) ?? r.max_occupancy

  // Oda-bazlı gerçek kapak görselleri (public/hotel-photos/rooms/{odaNo}/) —
  // yoksa nötr fallback. Render senkron olduğu için önceden çözüyoruz.
  const coverEntries = await Promise.all(
    rooms.map(async (r) => [r.id, await getRoomCover(r.room_number)] as const)
  )
  const coverMap = new Map<string, string>(coverEntries)

  const hasValidDates = !!(checkIn && checkOut && checkIn >= today && checkOut > checkIn)
  let bookedRoomIds = new Set<string>()

  if (hasValidDates) {
    const { data: conflicts } = await supabase
      .from('reservations')
      .select('room_id')
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', checkOut!)
      .gt('check_out', checkIn!)
    bookedRoomIds = new Set((conflicts ?? []).map((c) => c.room_id as string))
  }

  let filtered = rooms
  if (floor) filtered = filtered.filter((r) => String(r.floor) === floor)
  if (jacuzzi === 'true') filtered = filtered.filter((r) => r.has_jacuzzi)
  if (bathtub === 'true') filtered = filtered.filter((r) => r.has_bathtub)

  if (sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => a.effective_price - b.effective_price)
  } else if (sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => b.effective_price - a.effective_price)
  } else if (sort === 'view_best') {
    filtered = [...filtered].sort(
      (a, b) =>
        VIEW_ORDER[b.view_quality] - VIEW_ORDER[a.view_quality] ||
        a.effective_price - b.effective_price
    )
  }

  const nights = hasValidDates
    ? Math.round(
        (new Date(checkOut!).getTime() - new Date(checkIn!).getTime()) / 86400000
      )
    : null

  const availableCount = hasValidDates
    ? filtered.filter((r) => !bookedRoomIds.has(r.id)).length
    : null

  return (
    <>
      <Navbar />
      <main>
        {/* Header */}
        <section
          style={{
            background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #2a2018 100%)',
            padding: '4rem var(--spacing-container) 3rem',
          }}
        >
          <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
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
                marginBottom: '2rem',
              }}
            >
              {locale === 'uz'
                ? 'Anor Avenue xonalari'
                : locale === 'ru'
                ? 'Номера Anor Avenue'
                : 'Anor Avenue Rooms'}
            </h1>
            <div className="max-w-3xl">
              <BookingWidget
                defaultCheckIn={checkIn || today}
                defaultCheckOut={checkOut || tomorrow}
                defaultAdults={adults ? Number(adults) : 2}
              />
            </div>
          </div>
        </section>

        {/* Date info banner */}
        {hasValidDates && (
          <div
            style={{
              backgroundColor: 'rgba(201,169,110,0.1)',
              borderBottom: '1px solid rgba(201,169,110,0.2)',
              padding: '0.875rem var(--spacing-container)',
            }}
          >
            <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
              <p
                style={{
                  color: 'var(--color-gold-dark)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '600',
                }}
              >
                {locale === 'uz'
                  ? `${checkIn} — ${checkOut} · ${nights} kecha · ${adults || 2} kishi`
                  : locale === 'ru'
                  ? `${checkIn} — ${checkOut} · ${nights} ночей · ${adults || 2} гостей`
                  : `${checkIn} — ${checkOut} · ${nights} nights · ${adults || 2} guests`}
              </p>
            </div>
          </div>
        )}

        {/* Main content */}
        <section
          style={{
            backgroundColor: 'var(--color-cream)',
            padding: 'var(--spacing-section) var(--spacing-container)',
          }}
        >
          <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
            {/* Filter bar */}
            <Suspense fallback={<div style={{ height: '66px', marginBottom: '1.5rem' }} />}>
              <RoomsFilter locale={locale} />
            </Suspense>

            {/* Results summary */}
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                marginBottom: '1.5rem',
              }}
            >
              {locale === 'uz'
                ? `${filtered.length} ta xona`
                : locale === 'ru'
                ? `Номеров: ${filtered.length}`
                : `${filtered.length} rooms`}
              {availableCount !== null && (
                <span style={{ color: '#86EFAC', fontWeight: '600' }}>
                  {' · '}
                  {availableCount}
                  {locale === 'uz'
                    ? " ta bo'sh"
                    : locale === 'ru'
                    ? ' свободно'
                    : ' available'}
                </span>
              )}
            </p>

            {/* Room cards */}
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-5">
                {filtered.map((room) => {
                  const isBooked = hasValidDates && bookedRoomIds.has(room.id)
                  const typeSlug = TYPE_SLUG[room.room_type_name] ?? 'luxury'
                  const bookParams = new URLSearchParams({ roomType: typeSlug })
                  if (checkIn) bookParams.set('checkIn', checkIn)
                  if (checkOut) bookParams.set('checkOut', checkOut)
                  if (adults) bookParams.set('adults', adults)

                  const features: { key: string; icon: string }[] = []
                  if (room.has_jacuzzi) features.push({ key: 'jacuzzi', icon: '🛁' })
                  if (room.has_bathtub) features.push({ key: 'bathtub', icon: '🛁' })
                  if (room.is_isolated) features.push({ key: 'isolated', icon: '🔑' })
                  if (room.connecting_room_id) features.push({ key: 'connecting', icon: '🚪' })
                  if (room.view_quality === 'good') features.push({ key: 'viewGood', icon: '🌅' })
                  if (room.view_quality === 'premium') features.push({ key: 'viewPremium', icon: '🏙' })

                  return (
                    <div
                      key={room.id}
                      style={{
                        backgroundColor: 'var(--color-white)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-card)',
                        border: isBooked
                          ? '1px solid #991B1B'
                          : hasValidDates
                          ? '2px solid #16A34A'
                          : '1px solid var(--color-cream-dark)',
                        opacity: isBooked ? 0.65 : 1,
                      }}
                      className="grid grid-cols-1 md:grid-cols-5"
                    >
                      {/* Photo */}
                      <div
                        style={{ position: 'relative', minHeight: '200px', overflow: 'hidden' }}
                        className="md:col-span-2"
                      >
                        <Image
                          src={coverMap.get(room.id) ?? PHOTO_FALLBACK}
                          alt={`Room ${room.room_number}`}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 40vw"
                          quality={80}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 55%)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '1.25rem',
                            left: '1.25rem',
                            right: '1.25rem',
                            zIndex: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              alignItems: 'flex-start',
                            }}
                          >
                            <span
                              style={{
                                backgroundColor: 'rgba(201,169,110,0.25)',
                                border: '1px solid rgba(201,169,110,0.5)',
                                color: 'var(--color-gold-light)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: '600',
                                padding: '0.25rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {floorLabel(room.floor, locale)}
                            </span>
                            {hasValidDates &&
                              (isBooked ? (
                                <span
                                  style={{
                                    backgroundColor: '#450A0A',
                                    color: '#FCA5A5',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: '700',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'inline-block',
                                  }}
                                >
                                  {locale === 'uz' ? 'Band' : locale === 'ru' ? 'Занято' : 'Booked'}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    backgroundColor: '#14532D',
                                    color: '#86EFAC',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: '700',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'inline-block',
                                  }}
                                >
                                  {locale === 'uz' ? "Bo'sh" : locale === 'ru' ? 'Свободно' : 'Available'}
                                </span>
                              ))}
                          </div>
                          {/* Room number badge */}
                          <span
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.55)',
                              color: 'var(--color-white)',
                              fontSize: 'var(--text-base)',
                              fontWeight: '800',
                              padding: '0.35rem 0.85rem',
                              borderRadius: 'var(--radius-md)',
                              letterSpacing: '0.05em',
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            {room.room_number}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div
                        style={{ padding: '1.5rem' }}
                        className="md:col-span-3 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p
                                style={{
                                  color: 'var(--color-text-muted)',
                                  fontSize: 'var(--text-xs)',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  marginBottom: '0.2rem',
                                }}
                              >
                                {TYPE_NAMES[typeSlug]?.[locale] ?? typeSlug}
                              </p>
                              <h2
                                style={{
                                  fontFamily: 'var(--font-display)',
                                  fontSize: 'var(--text-xl)',
                                  color: 'var(--color-text-primary)',
                                  fontWeight: '700',
                                }}
                              >
                                {locale === 'uz'
                                  ? `${room.room_number}-xona`
                                  : locale === 'ru'
                                  ? `Номер ${room.room_number}`
                                  : `Room ${room.room_number}`}
                              </h2>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p
                                style={{
                                  color: 'var(--color-text-muted)',
                                  fontSize: 'var(--text-xs)',
                                }}
                              >
                                {locale === 'uz'
                                  ? 'bir kecha'
                                  : locale === 'ru'
                                  ? 'за ночь'
                                  : 'per night'}
                              </p>
                              <p
                                style={{
                                  color: 'var(--color-gold-dark)',
                                  fontWeight: '800',
                                  fontSize: 'var(--text-xl)',
                                  lineHeight: '1.2',
                                }}
                              >
                                {new Intl.NumberFormat().format(room.effective_price)}{' '}
                                <span
                                  style={{
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: '500',
                                  }}
                                >
                                  UZS
                                </span>
                              </p>
                              {nights && (
                                <p
                                  style={{
                                    color: 'var(--color-text-muted)',
                                    fontSize: 'var(--text-xs)',
                                    marginTop: '0.15rem',
                                  }}
                                >
                                  {new Intl.NumberFormat().format(
                                    room.effective_price * nights
                                  )}{' '}
                                  UZS /{' '}
                                  {nights}{' '}
                                  {locale === 'uz'
                                    ? 'kecha'
                                    : locale === 'ru'
                                    ? 'ночей'
                                    : 'nights'}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex gap-4 mt-2 mb-3 flex-wrap">
                            <span
                              style={{
                                color: 'var(--color-text-muted)',
                                fontSize: 'var(--text-sm)',
                              }}
                            >
                              👤{' '}
                              {locale === 'uz'
                                ? `${roomCapacity(room)} kishi`
                                : locale === 'ru'
                                ? `${roomCapacity(room)} чел.`
                                : `${roomCapacity(room)} guests`}
                            </span>
                            <span
                              style={{
                                color: 'var(--color-text-muted)',
                                fontSize: 'var(--text-sm)',
                              }}
                            >
                              🌅 {VIEW_LABELS[room.view_quality]?.[locale] ?? room.view_quality}
                            </span>
                          </div>

                          {/* Feature tags */}
                          {features.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {features.map(({ key, icon }) => (
                                <span
                                  key={key}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    backgroundColor: 'rgba(201,169,110,0.08)',
                                    border: '1px solid rgba(201,169,110,0.30)',
                                    color: 'var(--color-gold-dark)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: '600',
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: 'var(--radius-full)',
                                  }}
                                >
                                  {icon} {FEAT_LABELS[key]?.[locale] ?? key}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CTAs */}
                        <div className="flex gap-3 flex-wrap">
                          <Link
                            href={`/${locale}/rooms/${room.room_number}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'transparent',
                              color: 'var(--color-gold-dark)',
                              border: '1.5px solid var(--color-gold)',
                              padding: '0.65rem 1.25rem',
                              borderRadius: 'var(--radius-md)',
                              fontWeight: '600',
                              fontSize: 'var(--text-sm)',
                              transition: 'var(--transition-fast)',
                            }}
                            className="hover:opacity-80"
                          >
                            {locale === 'uz'
                              ? 'Batafsil'
                              : locale === 'ru'
                              ? 'Подробнее'
                              : 'Details'}
                          </Link>
                          {!isBooked ? (
                            <Link
                              href={`/${locale}/book?${bookParams.toString()}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--color-gold)',
                                color: 'var(--color-white)',
                                padding: '0.65rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '700',
                                fontSize: 'var(--text-sm)',
                                transition: 'var(--transition-fast)',
                                boxShadow: 'var(--shadow-gold)',
                              }}
                              className="hover:opacity-90"
                            >
                              {locale === 'uz'
                                ? 'Bron qilish'
                                : locale === 'ru'
                                ? 'Забронировать'
                                : 'Book Now'}{' '}
                              →
                            </Link>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.65rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: '600',
                                color: '#6B7280',
                                backgroundColor: '#1F2937',
                              }}
                            >
                              {locale === 'uz'
                                ? 'Band'
                                : locale === 'ru'
                                ? 'Занято'
                                : 'Booked'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 0',
                  color: 'var(--color-text-muted)',
                }}
              >
                <p style={{ fontSize: 'var(--text-lg)', marginBottom: '0.75rem' }}>
                  {locale === 'uz'
                    ? 'Filtrga mos xona topilmadi'
                    : locale === 'ru'
                    ? 'Номера не найдены'
                    : 'No rooms match your filters'}
                </p>
                <Link
                  href={`/${locale}/rooms`}
                  style={{
                    color: 'var(--color-gold-dark)',
                    fontWeight: '600',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {locale === 'uz'
                    ? 'Filtrlarni tozalash'
                    : locale === 'ru'
                    ? 'Сбросить фильтры'
                    : 'Clear filters'}
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
