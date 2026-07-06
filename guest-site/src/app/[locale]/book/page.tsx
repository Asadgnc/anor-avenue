import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingForm, { type ComboData } from '@/components/hotel/BookingForm'
import { supabase, createServiceClient } from '@/lib/supabase'
import { fetchRoomCapacities, nightsBetween } from '@/lib/availability'

const TYPE_SLUG: Record<string, 'standard' | 'deluxe' | 'luxury'> = {
  Standard: 'standard',
  Deluxe: 'deluxe',
  Luxury: 'luxury',
}

// Kombinasyon modunda seçilen odalar canlı doğrulanmalı → taze render
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    roomType?: string
    checkIn?: string
    checkOut?: string
    adults?: string
    rooms?: string
  }>
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { roomType, checkIn, checkOut, adults, rooms: roomsParam } = await searchParams
  setRequestLocale(locale)

  // Çoklu-oda ("kombinasyon") modu: /availability'den seçilen oda kümesi
  let combo: ComboData | null = null
  if (roomsParam && checkIn && checkOut) {
    const ids = [...new Set(roomsParam.split(',').map((s) => s.trim()).filter(Boolean))]
    if (ids.length > 0) {
      const service = createServiceClient()
      const [{ data: comboRows }, capMap] = await Promise.all([
        service
          .from('rooms_with_effective_price')
          .select('id, room_number, room_type_name, effective_price')
          .in('id', ids)
          .eq('is_active', true),
        fetchRoomCapacities(service),
      ])
      if (comboRows && comboRows.length > 0) {
        const nights = Math.max(1, nightsBetween(checkIn, checkOut))
        const comboRooms = comboRows.map((r) => ({
          id: r.id as string,
          roomNumber: r.room_number as string,
          typeName: r.room_type_name as string,
          typeSlug: TYPE_SLUG[r.room_type_name as string] ?? 'luxury',
          capacity: capMap.get(r.id as string) ?? 2,
          pricePerNight: Number(r.effective_price),
        }))
        const totalCapacity = comboRooms.reduce((s, r) => s + r.capacity, 0)
        combo = {
          rooms: comboRooms,
          checkIn,
          checkOut,
          nights,
          adults: Math.min(Number(adults) || totalCapacity, totalCapacity),
          totalPrice: comboRooms.reduce((s, r) => s + r.pricePerNight, 0) * nights,
        }
      }
    }
  }

  const title = locale === 'uz' ? 'Xona bron qilish' : locale === 'ru' ? 'Забронировать номер' : 'Book a Room'
  const subtitle =
    locale === 'uz'
      ? "Ma'lumotlaringizni kiriting, biz siz bilan bog'lanamiz"
      : locale === 'ru'
      ? 'Заполните форму, мы свяжемся с вами'
      : "Fill in your details, we'll get back to you"

  const { data: roomPriceData } = await supabase
    .from('rooms_with_effective_price')
    .select('room_type_name, effective_price')
    .eq('is_active', true)

  const minPrice = (dbName: string, fallback: number): number => {
    const rows = roomPriceData?.filter((r) => r.room_type_name === dbName) ?? []
    if (rows.length === 0) return fallback
    return Math.min(...rows.map((r) => Number(r.effective_price)))
  }

  const roomPrices = {
    standard: minPrice('Standard', 300000),
    deluxe: minPrice('Deluxe', 500000),
    luxury: minPrice('Luxury', 800000),
  }

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
          <div style={{ maxWidth: '700px' }} className="mx-auto">
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
              Anor Avenue
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-white)',
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: '700',
              }}
            >
              {title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: '0.75rem', fontSize: 'var(--text-base)' }}>
              {subtitle}
            </p>
          </div>
        </section>

        {/* Trust strip */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderBottom: '1px solid var(--color-cream-dark)',
            padding: '0.875rem var(--spacing-container)',
          }}
        >
          <div
            style={{ maxWidth: '700px' }}
            className="mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2"
          >
            {[
              locale === 'uz' ? '🔒 Ma\'lumotlar xavfsiz' : locale === 'ru' ? '🔒 Данные защищены' : '🔒 Secure & private',
              locale === 'uz' ? '📞 24/7 qo\'llab-quvvatlash' : locale === 'ru' ? '📞 Поддержка 24/7' : '📞 24/7 support',
            ].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Form section */}
        <section
          style={{
            backgroundColor: 'var(--color-cream)',
            padding: 'var(--spacing-section) var(--spacing-container)',
          }}
        >
          <div style={{ maxWidth: '700px' }} className="mx-auto">
            <BookingForm
              locale={locale}
              roomPrices={roomPrices}
              defaultRoomType={roomType}
              defaultCheckIn={checkIn}
              defaultCheckOut={checkOut}
              defaultAdults={adults}
              combo={combo}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
