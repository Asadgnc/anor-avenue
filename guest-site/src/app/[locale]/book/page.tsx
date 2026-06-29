import { setRequestLocale } from 'next-intl/server'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingForm from '@/components/hotel/BookingForm'
import { supabase } from '@/lib/supabase'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ roomType?: string; checkIn?: string; checkOut?: string; adults?: string }>
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { roomType, checkIn, checkOut, adults } = await searchParams
  setRequestLocale(locale)

  const title = locale === 'uz' ? 'Xona bron qilish' : locale === 'ru' ? 'Забронировать номер' : 'Book a Room'
  const subtitle =
    locale === 'uz'
      ? "Ma'lumotlaringizni kiriting, biz siz bilan bog'lanamiz"
      : locale === 'ru'
      ? 'Заполните форму, мы свяжемся с вами'
      : "Fill in your details, we'll get back to you"

  const { data: roomTypeData } = await supabase
    .from('room_types')
    .select('name, base_price')

  const byName = (name: string, fallback: number) =>
    Number(roomTypeData?.find((rt) => rt.name === name)?.base_price ?? fallback)

  const roomPrices = {
    standard: byName('Standart', 350000),
    luxury: byName('Lüks', 600000),
    mansard: byName('Delüks', 850000),
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
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
