import { setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'

// ─── Oda Verisi ──────────────────────────────────────────────────────────────

const TYPE_TO_DB_NAME: Record<string, string> = {
  standard: 'Standart',
  luxury: 'Lüks',
  mansard: 'Delüks',
}

const ROOM_DATA = {
  standard: {
    price: 350_000,
    floor: -1,
    maxOccupancy: 2,
    area: 22,
    count: 3,
    gradient: 'linear-gradient(160deg, #2c2c2e 0%, #1c1c1e 100%)',
    amenities: [
      { icon: '📶', uz: 'WiFi', ru: 'WiFi', en: 'WiFi' },
      { icon: '📺', uz: 'Smart TV', ru: 'Smart TV', en: 'Smart TV' },
      { icon: '❄️', uz: 'Konditsioner', ru: 'Кондиционер', en: 'Air Conditioning' },
      { icon: '🚿', uz: 'Dush', ru: 'Душ', en: 'Shower' },
      { icon: '☕', uz: 'Choy/qahva', ru: 'Чай/кофе', en: 'Tea/Coffee' },
      { icon: '🧴', uz: 'Gigiena to\'plami', ru: 'Средства гигиены', en: 'Toiletries' },
      { icon: '🔒', uz: 'Seyf', ru: 'Сейф', en: 'Safe' },
      { icon: '🛏', uz: '2 yotoq yoki 1 katta yotoq', ru: '2 кровати или 1 двуспальная', en: 'Twin or Double bed' },
    ],
    description: {
      uz: 'Standart xonalarimiz -1 qavatda joylashgan bo\'lib, qulay va ixcham muhitni taqdim etadi. Barcha zaruriy qulayliklar bilan jihozlangan bu xonalar byudjet turizmi uchun ideal tanlovdir. Tinch va yashil atrofdagi xonalar, dam olish uchun mukammal sharoit yaratadi.',
      ru: 'Наши стандартные номера расположены на цокольном этаже (-1) и предлагают уютную и комфортную обстановку. Оснащённые всеми необходимыми удобствами, эти номера идеально подходят для путешественников с ограниченным бюджетом. Тихое расположение создаёт идеальные условия для отдыха.',
      en: 'Our Standard rooms are located on the basement floor (-1) and offer a comfortable and cozy environment. Equipped with all essential amenities, these rooms are ideal for budget-conscious travelers. The quiet surroundings create perfect conditions for rest.',
    },
  },
  luxury: {
    price: 600_000,
    floor: 2,
    maxOccupancy: 2,
    area: 35,
    count: 6,
    gradient: 'linear-gradient(160deg, #3a2e1e 0%, #2a2018 100%)',
    amenities: [
      { icon: '📶', uz: 'WiFi', ru: 'WiFi', en: 'WiFi' },
      { icon: '📺', uz: 'Smart TV (55")', ru: 'Smart TV (55")', en: 'Smart TV (55")' },
      { icon: '❄️', uz: 'Konditsioner', ru: 'Кондиционер', en: 'Air Conditioning' },
      { icon: '🛁', uz: 'Vanna', ru: 'Ванна', en: 'Bathtub' },
      { icon: '🚿', uz: 'Dush', ru: 'Душ', en: 'Shower' },
      { icon: '🍾', uz: 'Minibar', ru: 'Мини-бар', en: 'Minibar' },
      { icon: '🛎', uz: 'Xona xizmati', ru: 'Обслуживание номеров', en: 'Room Service' },
      { icon: '☕', uz: 'Kapuchino mashinasi', ru: 'Кофемашина', en: 'Coffee Machine' },
      { icon: '🧴', uz: 'Premium gigiena to\'plami', ru: 'Premium средства гигиены', en: 'Premium Toiletries' },
      { icon: '🔒', uz: 'Seyf', ru: 'Сейф', en: 'Safe' },
      { icon: '🪑', uz: 'Mehmon xonasi', ru: 'Гостиная зона', en: 'Living Area' },
      { icon: '🏙', uz: 'Shahar manzarasi', ru: 'Вид на город', en: 'City View' },
    ],
    description: {
      uz: 'Lyuks xonalarimiz 2-3 qavatlarda joylashgan bo\'lib, kengroq makon va yuqori sifatli qulayliklarni taqdim etadi. Zamonaviy dизаyn va klassik lüks birikmasida bezatilgan bu xonalar, Toshkentning go\'zal manzarasini taqdim etadi. Vanna xonasida to\'liq komplekt gigiena mahsulotlari va minibar xizmati bilan ta\'minlangan.',
      ru: 'Наши номера люкс расположены на 2-3 этажах и предлагают более просторное пространство и удобства высшего класса. Оформленные в сочетании современного дизайна и классической роскоши, эти номера открывают великолепный вид на Ташкент. Ванная комната полностью укомплектована средствами гигиены, и в номере есть мини-бар.',
      en: 'Our Luxury rooms are located on floors 2-3 and offer more spacious accommodations with premium amenities. Decorated in a blend of modern design and classic luxury, these rooms offer beautiful views of Tashkent. The bathroom is fully stocked with toiletries, and the room includes a minibar.',
    },
  },
  mansard: {
    price: 850_000,
    floor: 4,
    maxOccupancy: 2,
    area: 42,
    count: 3,
    gradient: 'linear-gradient(160deg, #2a1e0e 0%, #1c1208 100%)',
    amenities: [
      { icon: '📶', uz: 'WiFi', ru: 'WiFi', en: 'WiFi' },
      { icon: '📺', uz: 'Smart TV (65")', ru: 'Smart TV (65")', en: 'Smart TV (65")' },
      { icon: '❄️', uz: 'Konditsioner', ru: 'Кондиционер', en: 'Air Conditioning' },
      { icon: '🛁', uz: 'Premium vanna', ru: 'Премиум ванна', en: 'Premium Bathtub' },
      { icon: '🚿', uz: 'Rain shower', ru: 'Тропический душ', en: 'Rain Shower' },
      { icon: '🍾', uz: 'Premium minibar', ru: 'Премиум мини-бар', en: 'Premium Minibar' },
      { icon: '🛎', uz: 'VIP xona xizmati', ru: 'VIP обслуживание', en: 'VIP Room Service' },
      { icon: '☕', uz: 'Kapuchino mashinasi', ru: 'Кофемашина Nespresso', en: 'Nespresso Machine' },
      { icon: '🧴', uz: 'Luxury gigiena to\'plami', ru: 'Luxury средства гигиены', en: 'Luxury Toiletries' },
      { icon: '🔒', uz: 'Seyf', ru: 'Сейф', en: 'Safe' },
      { icon: '🛋', uz: 'Yotoq xonasi bilan mehmon xonasi', ru: 'Гостиная и спальня', en: 'Living Room + Bedroom' },
      { icon: '🏙', uz: 'Panoramik manzara', ru: 'Панорамный вид', en: 'Panoramic View' },
      { icon: '🛁', uz: 'Xalat va shippaklar', ru: 'Халат и тапочки', en: 'Bathrobe & Slippers' },
      { icon: '🌙', uz: 'Mansard tom — alohida atmosfera', ru: 'Мансардная крыша — особая атмосфера', en: 'Mansard roof — unique atmosphere' },
    ],
    description: {
      uz: '4-qavatda joylashgan Mansard Lyuks xonalarimiz — mehmonxonamizning eng noyob va hashamatli takliflari. Qiyshiq tom va panoramik derazalar bu xonalarga alohida romantik ruh beradi. Keng mehmon xonasi va ajratilgan yotoqxona bilan u kichkina apartamentga o\'xshaydi. Toshkentning to\'liq panoramasini tomosha qiling.',
      ru: 'Наши номера Мансардный Люкс, расположенные на 4-м этаже — самые уникальные и роскошные предложения нашего отеля. Скошенный потолок и панорамные окна придают этим номерам особый романтический дух. С просторной гостиной и отдельной спальней они напоминают небольшие апартаменты. Наслаждайтесь полной панорамой Ташкента.',
      en: 'Our Mansard Luxury rooms on the 4th floor are the most unique and lavish offerings of our hotel. The sloped ceiling and panoramic windows give these rooms a special romantic character. With a spacious living area and separate bedroom, they feel like a small apartment. Enjoy the full panorama of Tashkent.',
    },
  },
} as const

type RoomType = keyof typeof ROOM_DATA

const ROOM_PHOTOS: Record<RoomType, { hero: string; gallery: { src: string; labelKey: string }[] }> = {
  standard: {
    hero: '/hotel-photos/some-delicious-meal-bed-bedroom-side-view.jpg',
    gallery: [
      { src: '/hotel-photos/some-delicious-meal-bed-bedroom-side-view.jpg', labelKey: 'bedroom' },
      { src: '/hotel-photos/hotel-bathroom-jacuzzi.jpeg', labelKey: 'bathroom' },
      { src: '/hotel-photos/breakfast-set-with-various-food-table.jpg', labelKey: 'service' },
      { src: '/hotel-photos/hotel-courtyard.jpeg', labelKey: 'view' },
    ],
  },
  luxury: {
    hero: '/hotel-photos/3d-rendering-beautiful-comtemporary-luxury-bedroom-suite-hotel-with-tv.jpg',
    gallery: [
      { src: '/hotel-photos/3d-rendering-beautiful-comtemporary-luxury-bedroom-suite-hotel-with-tv.jpg', labelKey: 'bedroom' },
      { src: '/hotel-photos/hotel-bathroom-jacuzzi.jpeg', labelKey: 'bathroom' },
      { src: '/hotel-photos/croissant-boiled-egg-orange-juice-yogurt-breakfast-tray-bed-hotel-room.jpg', labelKey: 'service' },
      { src: '/hotel-photos/woman-laying-bed-enjoys-breakfast-tray-hotel-room.jpg', labelKey: 'view' },
    ],
  },
  mansard: {
    hero: '/hotel-photos/woman-laying-bed-enjoys-breakfast-tray-hotel-room.jpg',
    gallery: [
      { src: '/hotel-photos/woman-laying-bed-enjoys-breakfast-tray-hotel-room.jpg', labelKey: 'bedroom' },
      { src: '/hotel-photos/hotel-bathroom-jacuzzi.jpeg', labelKey: 'bathroom' },
      { src: '/hotel-photos/top-view-assorted-breakfast-with-oatmeal-fried-eggs-human-hand-white-plate.jpg', labelKey: 'service' },
      { src: '/hotel-photos/some-delicious-meal-bed-bedroom-side-view.jpg', labelKey: 'view' },
    ],
  },
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string }>
}): Promise<Metadata> {
  const { type, locale } = await params
  if (!(type in ROOM_DATA)) return {}
  const room = ROOM_DATA[type as RoomType]
  const names: Record<string, Record<string, string>> = {
    standard: { uz: 'Standart xona', ru: 'Стандартный номер', en: 'Standard Room' },
    luxury:   { uz: 'Lyuks xona',    ru: 'Люкс',             en: 'Luxury Room' },
    mansard:  { uz: 'Mansard lyuks', ru: 'Мансардный люкс',  en: 'Mansard Luxury' },
  }
  const name = names[type]?.[locale] ?? type
  return {
    title: `${name} — Anor Avenue Hotel`,
    description: room.description[locale as keyof typeof room.description] ?? room.description.en,
  }
}

export function generateStaticParams() {
  return Object.keys(ROOM_DATA).map((type) => ({ type }))
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; type: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string }>
}) {
  const { locale, type } = await params
  const { checkIn, checkOut, adults } = await searchParams
  setRequestLocale(locale)

  if (!(type in ROOM_DATA)) notFound()
  const roomStatic = ROOM_DATA[type as RoomType]

  const dbName = TYPE_TO_DB_NAME[type]
  const { data: roomFeatureRows } = await supabase
    .from('rooms_with_effective_price')
    .select('has_jacuzzi, has_bathtub, is_isolated, view_quality, connecting_room_id, effective_price')
    .eq('room_type_name', dbName)
    .eq('is_active', true)

  const roomFeatures = {
    jacuzzi: roomFeatureRows?.some((r) => r.has_jacuzzi) ?? false,
    bathtub: roomFeatureRows?.some((r) => r.has_bathtub) ?? false,
    isolated: roomFeatureRows?.some((r) => r.is_isolated) ?? false,
    premiumShower: roomFeatureRows?.some((r) => r.has_jacuzzi) ?? false,
    viewPremium: roomFeatureRows?.some((r) => r.view_quality === 'premium') ?? false,
    connecting: roomFeatureRows?.some((r) => r.connecting_room_id != null) ?? false,
  }

  const minEffectivePrice =
    roomFeatureRows && roomFeatureRows.length > 0
      ? Math.min(...roomFeatureRows.map((r) => Number(r.effective_price)))
      : roomStatic.price

  const room = {
    ...roomStatic,
    price: minEffectivePrice,
    count: roomFeatureRows?.length ?? roomStatic.count,
  }

  const roomPhotos = ROOM_PHOTOS[type as RoomType]

  const names: Record<string, Record<string, string>> = {
    standard: { uz: 'Standart xona', ru: 'Стандартный номер', en: 'Standard Room' },
    luxury:   { uz: 'Lyuks xona',    ru: 'Люкс',             en: 'Luxury Room' },
    mansard:  { uz: 'Mansard lyuks', ru: 'Мансардный люкс',  en: 'Mansard Luxury' },
  }
  const roomName = names[type]?.[locale] ?? type

  // Kitap bağlantısı — tarihleri URL'den geçir
  const bookParams = new URLSearchParams({ roomType: type })
  if (checkIn) bookParams.set('checkIn', checkIn)
  if (checkOut) bookParams.set('checkOut', checkOut)
  if (adults) bookParams.set('adults', adults)
  const bookHref = `/${locale}/book?${bookParams.toString()}`

  const floorLabel = (floor: number) => {
    if (floor < 0) return locale === 'uz' ? 'Yer osti (-1 qavat)' : locale === 'ru' ? 'Цокольный (-1 этаж)' : 'Basement (-1F)'
    return locale === 'uz' ? `${floor}-qavat` : locale === 'ru' ? `${floor} этаж` : `Floor ${floor}`
  }

  const description = room.description[locale as keyof typeof room.description] ?? room.description.en

  const labels = {
    backToRooms: locale === 'uz' ? '← Barcha xonalar' : locale === 'ru' ? '← Все номера' : '← All Rooms',
    area: locale === 'uz' ? `${room.area} m²` : `${room.area} m²`,
    occupancy: locale === 'uz' ? `${room.maxOccupancy} kishi` : locale === 'ru' ? `${room.maxOccupancy} чел.` : `${room.maxOccupancy} guests`,
    rooms: locale === 'uz' ? `${room.count} ta xona` : locale === 'ru' ? `${room.count} номера` : `${room.count} rooms`,
    from: locale === 'uz' ? 'dan boshlab' : locale === 'ru' ? 'от' : 'from',
    perNight: locale === 'uz' ? '/ bir kecha' : locale === 'ru' ? '/ за ночь' : '/ per night',
    bookNow: locale === 'uz' ? 'Hozir bron qilish' : locale === 'ru' ? 'Забронировать' : 'Book Now',
    amenities: locale === 'uz' ? 'Xona imkoniyatlari' : locale === 'ru' ? 'Удобства номера' : 'Room Amenities',
    description: locale === 'uz' ? 'Xona haqida' : locale === 'ru' ? 'О номере' : 'About the Room',
    gallery: locale === 'uz' ? 'Galereya' : locale === 'ru' ? 'Галерея' : 'Gallery',
  }

  return (
    <>
      <Navbar />

      {/* ── Mobil yapışkan rezervasyon barı ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-t"
        style={{
          backgroundColor: 'var(--color-white)',
          borderColor: 'var(--color-cream-dark)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{labels.from}</p>
          <p style={{ fontWeight: '800', color: 'var(--color-gold-dark)', fontSize: 'var(--text-lg)', lineHeight: '1.2' }}>
            {new Intl.NumberFormat().format(room.price)}{' '}
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: '500', color: 'var(--color-text-muted)' }}>UZS</span>
          </p>
        </div>
        <Link
          href={bookHref}
          style={{
            backgroundColor: 'var(--color-gold)',
            color: 'var(--color-white)',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: 'var(--text-sm)',
            boxShadow: 'var(--shadow-gold)',
            whiteSpace: 'nowrap',
          }}
        >
          {labels.bookNow} →
        </Link>
      </div>

      <main className="pb-20 lg:pb-0">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ minHeight: '420px', position: 'relative', overflow: 'hidden' }}>
          <Image
            src={roomPhotos.hero}
            alt={roomName}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            sizes="100vw"
            priority
            quality={85}
          />
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.15) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative', zIndex: 1,
              maxWidth: 'var(--max-width)', margin: '0 auto',
              padding: '2rem var(--spacing-container)',
            }}
          >
            <Link
              href={`/${locale}/rooms`}
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 'var(--text-sm)',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                transition: 'var(--transition-fast)',
              }}
              className="hover:opacity-100"
            >
              {labels.backToRooms}
            </Link>
          </div>
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxWidth: 'var(--max-width)', margin: '0 auto',
              padding: '2rem var(--spacing-container) 3rem',
            }}
          >
            <p
              style={{
                color: 'var(--color-gold)',
                fontSize: 'var(--text-xs)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '0.5rem',
              }}
            >
              {floorLabel(room.floor)}
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-white)',
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: '700',
                lineHeight: '1.2',
              }}
            >
              {roomName}
            </h1>
            <div className="flex items-center gap-6 mt-3 flex-wrap">
              {[
                { icon: '👤', text: labels.occupancy },
                { icon: '📐', text: labels.area },
                { icon: '🏨', text: labels.rooms },
              ].map((s) => (
                <span key={s.text} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 'var(--text-sm)' }}>
                  {s.icon} {s.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Ana İçerik ───────────────────────────────────────────────── */}
        <section
          style={{
            backgroundColor: 'var(--color-cream)',
            padding: 'var(--spacing-section) var(--spacing-container)',
          }}
        >
          <div
            style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-10"
          >
            {/* Sol sütun — 2 kolon */}
            <div className="lg:col-span-2 space-y-10">

              {/* Açıklama */}
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--color-text-primary)',
                    marginBottom: '1rem',
                  }}
                >
                  {labels.description}
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.8', fontSize: 'var(--text-base)' }}>
                  {description}
                </p>
              </div>

              {/* Oda özellik etiketleri */}
              <RoomFeatureTags features={roomFeatures} />

              {/* Galeri */}
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--color-text-primary)',
                    marginBottom: '1rem',
                  }}
                >
                  {labels.gallery}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {roomPhotos.gallery.map((item, i) => {
                    const galleryLabel =
                      item.labelKey === 'bedroom'
                        ? locale === 'uz' ? 'Yotoqxona' : locale === 'ru' ? 'Спальня' : 'Bedroom'
                        : item.labelKey === 'bathroom'
                        ? locale === 'uz' ? 'Vanna xonasi' : locale === 'ru' ? 'Ванная' : 'Bathroom'
                        : item.labelKey === 'service'
                        ? locale === 'uz' ? 'Xizmat' : locale === 'ru' ? 'Сервис' : 'Service'
                        : locale === 'uz' ? 'Ko\'rinish' : locale === 'ru' ? 'Вид' : 'View'
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          minHeight: i === 0 ? '220px' : '140px',
                          gridColumn: i === 0 ? 'span 2' : 'span 1',
                          overflow: 'hidden',
                        }}
                      >
                        <Image
                          src={item.src}
                          alt={galleryLabel}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          quality={80}
                        />
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '0.75rem',
                            left: '0.75rem',
                            zIndex: 1,
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: '600',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {galleryLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Olanaklar */}
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--color-text-primary)',
                    marginBottom: '1rem',
                  }}
                >
                  {labels.amenities}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.amenities.map((a) => {
                    const label = a[locale as keyof typeof a] ?? a.en
                    return (
                      <div
                        key={a.en}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-white)',
                          border: '1px solid var(--color-cream-dark)',
                          boxShadow: 'var(--shadow-soft)',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{a.icon}</span>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Sağ sütun — rezervasyon kartı */}
            <div>
              <div
                style={{
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-cream-dark)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-card)',
                  position: 'sticky',
                  top: '2rem',
                }}
              >
                {/* Fiyat */}
                <div style={{ borderBottom: '1px solid var(--color-cream-dark)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: '0.25rem' }}>
                    {labels.from}
                  </p>
                  <div className="flex items-end gap-1">
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--text-3xl)',
                        fontWeight: '700',
                        color: 'var(--color-gold-dark)',
                        lineHeight: '1',
                      }}
                    >
                      {new Intl.NumberFormat().format(room.price)}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', paddingBottom: '2px' }}>
                      UZS {labels.perNight}
                    </span>
                  </div>
                </div>

                {/* Özellikler */}
                <div style={{ marginBottom: '1.5rem' }} className="space-y-2">
                  {[
                    { icon: '👤', text: labels.occupancy },
                    { icon: '📐', text: labels.area },
                    { icon: '🏨', text: `${labels.rooms} ${locale === 'uz' ? 'mavjud' : locale === 'ru' ? 'доступно' : 'available'}` },
                    { icon: '🏢', text: floorLabel(room.floor) },
                  ].map((s) => (
                    <div key={s.text} className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                      <span>{s.icon}</span>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={bookHref}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--color-gold)',
                    color: 'var(--color-white)',
                    padding: '0.875rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '700',
                    fontSize: 'var(--text-base)',
                    transition: 'var(--transition-fast)',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-gold)',
                    width: '100%',
                  }}
                  className="hover:opacity-90"
                >
                  {labels.bookNow} →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

// ─── Oda Özellik Etiketleri ──────────────────────────────────────────────────

type RoomFeaturesMap = {
  jacuzzi: boolean
  bathtub: boolean
  isolated: boolean
  premiumShower: boolean
  viewPremium: boolean
  connecting: boolean
}

function RoomFeatureTags({ features }: { features: RoomFeaturesMap }) {
  const t = useTranslations('roomFeatures')

  const allTags: { key: keyof RoomFeaturesMap; icon: string }[] = [
    { key: 'jacuzzi', icon: '🛁' },
    { key: 'bathtub', icon: '🛁' },
    { key: 'isolated', icon: '🔑' },
    { key: 'premiumShower', icon: '🚿' },
    { key: 'viewPremium', icon: '🏙' },
    { key: 'connecting', icon: '🚪' },
  ]
  const activeTags = allTags.filter(({ key }) => features[key])

  if (activeTags.length === 0) return null

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {activeTags.map(({ key, icon }) => (
          <span
            key={key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(201,169,110,0.10)',
              border: '1px solid rgba(201,169,110,0.35)',
              color: 'var(--color-gold-dark)',
              fontSize: 'var(--text-xs)',
              fontWeight: '600',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {icon} {t(key)}
          </span>
        ))}
      </div>
    </div>
  )
}
