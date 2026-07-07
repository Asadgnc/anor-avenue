import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'
import { createServiceClient } from '@/lib/supabase'
import { findAvailability, type Offer, type BookableRoom } from '@/lib/availability'

// Müsaitlik canlı rezervasyon verisine bağlı → her istekte taze hesaplanmalı
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string }>
}

// ─── i18n (inline — book/page.tsx ile aynı tarz) ─────────────────────────────

const T = {
  uz: {
    eyebrow: 'Aqlli tanlov',
    title: 'Siz uchun eng mos xonalar',
    nights: 'kecha',
    guests: 'kishi',
    room: 'xona',
    rooms: 'xona',
    exactFit: 'Aynan mos',
    extraSpace: (n: number) => `+${n} bo'sh joy`,
    perNight: '/kecha',
    total: 'Jami',
    select: 'Shu variantni tanlash',
    optionN: (n: number) => `${n}-variant`,
    noExactTitle: 'Kechirasiz, aynan mos xona yo\'q',
    noExactBody:
      'Tanlangan sanalarda barcha mehmonlaringiz uchun yetarli bo\'sh xona qolmadi. Quyidagilarni sinab ko\'ring:',
    canHost: (n: number) => `Hozir ${n} mehmongacha joylashtira olamiz`,
    changeDates: 'Boshqa sanalarni tanlang',
    contact: 'Resepsiyon bilan bog\'laning',
    missingDates: 'Iltimos, kelish/ketish sanalari va mehmonlar sonini kiriting.',
    floor: (f: number) =>
      f < 0 ? "Bog'cha qavati" : `${f}-qavat`,
    typeNames: { standard: 'Standart', deluxe: 'Delyuks', luxury: 'Lyuks' } as Record<string, string>,
  },
  ru: {
    eyebrow: 'Умный подбор',
    title: 'Лучшие варианты для вас',
    nights: 'ночей',
    guests: 'гостей',
    room: 'номер',
    rooms: 'номера',
    exactFit: 'Точно подходит',
    extraSpace: (n: number) => `+${n} свободных мест`,
    perNight: '/ночь',
    total: 'Итого',
    select: 'Выбрать этот вариант',
    optionN: (n: number) => `Вариант ${n}`,
    noExactTitle: 'К сожалению, точного варианта нет',
    noExactBody:
      'На выбранные даты не хватает свободных номеров для всех гостей. Попробуйте следующее:',
    canHost: (n: number) => `Сейчас можем разместить до ${n} гостей`,
    changeDates: 'Выберите другие даты',
    contact: 'Связаться с ресепшн',
    missingDates: 'Пожалуйста, укажите даты заезда/выезда и число гостей.',
    floor: (f: number) => (f < 0 ? 'Садовый этаж' : `${f} этаж`),
    typeNames: { standard: 'Стандартный', deluxe: 'Делюкс', luxury: 'Люкс' } as Record<string, string>,
  },
  en: {
    eyebrow: 'Smart match',
    title: 'The best options for you',
    nights: 'nights',
    guests: 'guests',
    room: 'room',
    rooms: 'rooms',
    exactFit: 'Perfect fit',
    extraSpace: (n: number) => `+${n} spare beds`,
    perNight: '/night',
    total: 'Total',
    select: 'Choose this option',
    optionN: (n: number) => `Option ${n}`,
    noExactTitle: 'Sorry, no exact match',
    noExactBody:
      'There are not enough free rooms for all your guests on these dates. Try the following:',
    canHost: (n: number) => `We can currently host up to ${n} guests`,
    changeDates: 'Pick different dates',
    contact: 'Contact reception',
    missingDates: 'Please provide check-in/check-out dates and number of guests.',
    floor: (f: number) => (f < 0 ? 'Garden Floor' : `Floor ${f}`),
    typeNames: { standard: 'Standard', deluxe: 'Deluxe', luxury: 'Luxury' } as Record<string, string>,
  },
} as const

type Lang = keyof typeof T

const fmt = (n: number) => new Intl.NumberFormat().format(n)

// ─── Sayfa ───────────────────────────────────────────────────────────────────

export default async function AvailabilityPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { checkIn, checkOut, adults } = await searchParams
  setRequestLocale(locale)

  const t = T[(locale as Lang) in T ? (locale as Lang) : 'uz']
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const partySize = Math.max(1, Math.min(29, Number(adults) || 0))
  const hasValidInput = !!(
    checkIn &&
    checkOut &&
    checkIn >= today &&
    checkOut > checkIn &&
    partySize >= 1
  )

  const result = hasValidInput
    ? await findAvailability(
        createServiceClient(),
        {
          checkIn: checkIn!,
          checkOut: checkOut!,
          partySize,
        },
        { publicOnly: true }
      )
    : null

  return (
    <>
      <Navbar />
      <main>
        {/* Header + re-search widget */}
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
              {t.eyebrow}
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
              {t.title}
            </h1>
            <div className="max-w-3xl">
              <BookingWidget
                defaultCheckIn={checkIn || today}
                defaultCheckOut={checkOut || tomorrow}
                defaultAdults={partySize || 2}
              />
            </div>
          </div>
        </section>

        {/* Info line */}
        {hasValidInput && result && (
          <div
            style={{
              backgroundColor: 'rgba(201,169,110,0.1)',
              borderBottom: '1px solid rgba(201,169,110,0.2)',
              padding: '0.875rem var(--spacing-container)',
            }}
          >
            <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
              <p style={{ color: 'var(--color-gold-dark)', fontSize: 'var(--text-sm)', fontWeight: '600' }}>
                {checkIn} — {checkOut} · {result.nights} {t.nights} · {partySize} {t.guests}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        <section
          style={{
            backgroundColor: 'var(--color-cream)',
            padding: 'var(--spacing-section) var(--spacing-container)',
          }}
        >
          <div style={{ maxWidth: '900px' }} className="mx-auto">
            {!hasValidInput && (
              <EmptyNote text={t.missingDates} />
            )}

            {hasValidInput && result && result.status === 'ok' && (
              <div className="flex flex-col gap-5">
                {result.offers.map((offer, i) => (
                  <OfferCard
                    key={offer.rooms.map((r) => r.id).join('-')}
                    offer={offer}
                    index={i}
                    locale={locale}
                    t={t}
                    checkIn={checkIn!}
                    checkOut={checkOut!}
                    partySize={partySize}
                  />
                ))}
              </div>
            )}

            {hasValidInput && result && result.status === 'insufficient' && (
              <InsufficientBlock
                locale={locale}
                t={t}
                result={result}
                checkIn={checkIn!}
                checkOut={checkOut!}
                partySize={partySize}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

// ─── Teklif Kartı ────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  index,
  locale,
  t,
  checkIn,
  checkOut,
  partySize,
}: {
  offer: Offer
  index: number
  locale: string
  t: (typeof T)[Lang]
  checkIn: string
  checkOut: string
  partySize: number
}) {
  const bookParams = new URLSearchParams({
    rooms: offer.rooms.map((r) => r.id).join(','),
    checkIn,
    checkOut,
    adults: String(partySize),
  })

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        border: offer.exactFit ? '2px solid #16A34A' : '1px solid var(--color-cream-dark)',
        padding: '1.5rem',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: '700',
              color: 'var(--color-text-primary)',
            }}
          >
            {t.optionN(index + 1)}
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: '700',
              padding: '0.2rem 0.7rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: offer.exactFit ? '#14532D' : 'rgba(201,169,110,0.15)',
              color: offer.exactFit ? '#86EFAC' : 'var(--color-gold-dark)',
            }}
          >
            {offer.exactFit ? t.exactFit : t.extraSpace(offer.waste)}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {offer.roomCount} {offer.roomCount === 1 ? t.room : t.rooms}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.total}</p>
          <p
            style={{
              color: 'var(--color-gold-dark)',
              fontWeight: '800',
              fontSize: 'var(--text-xl)',
              lineHeight: '1.2',
            }}
          >
            {fmt(offer.totalPrice)} <span style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}>UZS</span>
          </p>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex flex-wrap gap-2 mt-4">
        {offer.rooms.map((r) => (
          <RoomChip key={r.id} room={r} locale={locale} t={t} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-5">
        <Link
          href={`/${locale}/book?${bookParams.toString()}`}
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
            boxShadow: 'var(--shadow-gold)',
          }}
          className="hover:opacity-90"
        >
          {t.select} →
        </Link>
      </div>
    </div>
  )
}

function RoomChip({ room, locale, t }: { room: BookableRoom; locale: string; t: (typeof T)[Lang] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
        backgroundColor: 'var(--color-cream)',
        border: '1px solid var(--color-cream-dark)',
        borderRadius: 'var(--radius-md)',
        padding: '0.6rem 0.9rem',
        minWidth: '150px',
      }}
    >
      <span style={{ fontWeight: '700', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
        {t.typeNames[room.typeSlug]} · {room.roomNumber}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        👤 {room.capacity} {t.guests} · {t.floor(room.floor)}
      </span>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gold-dark)', fontWeight: '600' }}>
        {fmt(room.pricePerNight)} UZS{t.perNight}
      </span>
    </div>
  )
}

// ─── Yetersiz (özür) bloğu ───────────────────────────────────────────────────

function InsufficientBlock({
  locale,
  t,
  result,
  checkIn,
  checkOut,
  partySize,
}: {
  locale: string
  t: (typeof T)[Lang]
  result: import('@/lib/availability').AvailabilityResult
  checkIn: string
  checkOut: string
  partySize: number
}) {
  return (
    <div className="flex flex-col gap-5">
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--color-cream-dark)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🙏</div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: '700',
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
          }}
        >
          {t.noExactTitle}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '520px', margin: '0 auto' }}>
          {t.noExactBody}
        </p>
        {result.freeCapacity > 0 && (
          <p style={{ color: 'var(--color-gold-dark)', fontWeight: '700', fontSize: 'var(--text-sm)', marginTop: '1rem' }}>
            {t.canHost(result.freeCapacity)}
          </p>
        )}
      </div>

      {/* Partial suggestion — as a selectable offer for freeCapacity guests */}
      {result.partial && (
        <OfferCard
          offer={result.partial}
          index={0}
          locale={locale}
          t={t}
          checkIn={checkIn}
          checkOut={checkOut}
          partySize={Math.min(partySize, result.freeCapacity)}
        />
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href={`/${locale}`}
          style={{
            backgroundColor: 'var(--color-charcoal)',
            color: 'var(--color-white)',
            padding: '0.7rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: '600',
            fontSize: 'var(--text-sm)',
          }}
        >
          {t.changeDates}
        </Link>
      </div>
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
      <p style={{ fontSize: 'var(--text-base)' }}>{text}</p>
    </div>
  )
}
