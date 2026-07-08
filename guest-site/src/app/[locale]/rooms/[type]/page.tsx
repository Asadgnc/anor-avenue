import { setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import CoverImage from '@/components/hotel/CoverImage'
import { supabase, createServiceClient } from '@/lib/supabase'
import { fetchRoomCapacities } from '@/lib/availability'
import { getRoomGallery, PHOTO_FALLBACK } from '@/lib/roomPhotos'
import type { Metadata } from 'next'

// ─── Oda-bazlı detay sayfası ──────────────────────────────────────────────────
// Not: Klasör adı [type] ama parametre değeri artık ODA NUMARASI (101, 202, …).
// Kaynak gerçeklik DB (rooms_with_effective_price) + odanın gerçek foto klasörü.

type Locale = 'uz' | 'ru' | 'en'

const TYPE_SLUG: Record<string, 'standard' | 'deluxe' | 'luxury'> = {
  Standard: 'standard',
  Deluxe: 'deluxe',
  Luxury: 'luxury',
}

const TYPE_NAMES: Record<string, Record<Locale, string>> = {
  standard: { uz: 'Standart', ru: 'Стандарт', en: 'Standard' },
  deluxe: { uz: 'Delyuks', ru: 'Делюкс', en: 'Deluxe' },
  luxury: { uz: 'Lyuks', ru: 'Люкс', en: 'Luxury' },
}

// Tip bazlı olanaklar (odalar arası ortak konfor). Her odada mevcut olanlar.
const AMENITIES: Record<'standard' | 'deluxe' | 'luxury', { icon: string; uz: string; ru: string; en: string }[]> = {
  standard: [
    { icon: '📶', uz: 'WiFi', ru: 'WiFi', en: 'WiFi' },
    { icon: '📺', uz: 'Smart TV', ru: 'Smart TV', en: 'Smart TV' },
    { icon: '❄️', uz: 'Konditsioner', ru: 'Кондиционер', en: 'Air Conditioning' },
    { icon: '🚿', uz: 'Dush', ru: 'Душ', en: 'Shower' },
    { icon: '☕', uz: 'Choy/qahva to‘plami', ru: 'Чай/кофе', en: 'Tea/Coffee set' },
    { icon: '🪟', uz: 'Zebra parda', ru: 'Зебра-шторы', en: 'Zebra blinds' },
    { icon: '🧴', uz: 'Gigiena to‘plami', ru: 'Средства гигиены', en: 'Toiletries' },
    { icon: '🛏', uz: 'Yumshoq to‘shak', ru: 'Удобная кровать', en: 'Comfortable bed' },
  ],
  deluxe: [
    { icon: '📶', uz: 'WiFi', ru: 'WiFi', en: 'WiFi' },
    { icon: '📺', uz: 'Smart TV', ru: 'Smart TV', en: 'Smart TV' },
    { icon: '❄️', uz: 'Konditsioner', ru: 'Кондиционер', en: 'Air Conditioning' },
    { icon: '🚿', uz: 'Dush / vanna', ru: 'Душ / ванна', en: 'Shower / bathtub' },
    { icon: '☕', uz: 'Choy/qahva to‘plami', ru: 'Чай/кофе', en: 'Tea/Coffee set' },
    { icon: '🧊', uz: 'Mini muzlatgich', ru: 'Мини-холодильник', en: 'Mini-fridge' },
    { icon: '🛋', uz: 'Dam olish burchagi', ru: 'Зона отдыха', en: 'Seating area' },
    { icon: '🪟', uz: 'Zebra parda', ru: 'Зебра-шторы', en: 'Zebra blinds' },
    { icon: '🧴', uz: 'Premium gigiena', ru: 'Premium гигиена', en: 'Premium toiletries' },
  ],
  luxury: [
    { icon: '📶', uz: 'WiFi', ru: 'WiFi', en: 'WiFi' },
    { icon: '📺', uz: 'Smart TV', ru: 'Smart TV', en: 'Smart TV' },
    { icon: '❄️', uz: 'Konditsioner', ru: 'Кондиционер', en: 'Air Conditioning' },
    { icon: '🚿', uz: 'Yomg‘ir dush', ru: 'Тропический душ', en: 'Rain shower' },
    { icon: '☕', uz: 'Choy/qahva to‘plami', ru: 'Чай/кофе', en: 'Tea/Coffee set' },
    { icon: '🛋', uz: 'Keng dam olish zonasi', ru: 'Просторная зона отдыха', en: 'Spacious lounge area' },
    { icon: '🪟', uz: 'Zebra parda', ru: 'Зебра-шторы', en: 'Zebra blinds' },
    { icon: '🧴', uz: 'Luxury gigiena', ru: 'Luxury гигиена', en: 'Luxury toiletries' },
  ],
}

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

async function fetchRoom(roomNumber: string): Promise<RoomRow | null> {
  const { data } = await supabase
    .from('rooms_with_effective_price')
    .select(
      'id, room_number, floor, room_type_name, effective_price, view_quality, has_jacuzzi, has_bathtub, is_isolated, connecting_room_id, max_occupancy, is_active'
    )
    .eq('room_number', roomNumber)
    .eq('is_active', true)
    .eq('is_public', true)
    .maybeSingle()
  return (data as RoomRow) ?? null
}

// ─── Metin üretimi (fotoğraf + DB'den, uydurma yok) ───────────────────────────

function floorLabel(floor: number, locale: Locale): string {
  if (floor < 0) return locale === 'uz' ? 'Bog‘ zamin qavati' : locale === 'ru' ? 'Садовый этаж' : 'Garden floor'
  if (floor === 4) return locale === 'uz' ? '4-qavat · mansard' : locale === 'ru' ? '4 этаж · мансарда' : 'Floor 4 · mansard'
  return locale === 'uz' ? `${floor}-qavat` : locale === 'ru' ? `${floor} этаж` : `Floor ${floor}`
}

function viewLabel(v: RoomRow['view_quality'], locale: Locale): string {
  if (v === 'premium') return locale === 'uz' ? 'Panoramik manzara' : locale === 'ru' ? 'Панорамный вид' : 'Panoramic view'
  if (v === 'good') return locale === 'uz' ? 'Yaxshi manzara' : locale === 'ru' ? 'Хороший вид' : 'Good view'
  return locale === 'uz' ? 'Tinch hovli' : locale === 'ru' ? 'Тихий двор' : 'Quiet courtyard'
}

// Odanın satış açıklaması — sadece DB'de kesin olan özelliklerden.
function buildDescription(room: RoomRow, locale: Locale): string {
  const slug = TYPE_SLUG[room.room_type_name] ?? 'luxury'
  const parts: string[] = []

  // 1) Giriş — kat + tip
  if (room.floor < 0) {
    parts.push(
      locale === 'uz'
        ? 'Bog‘ zamin qavatidagi keng va ferah xona — tabiiy yorug‘lik oladi, tinch va sokin muhit taqdim etadi.'
        : locale === 'ru'
        ? 'Просторный и светлый номер на садовом этаже — с естественным освещением, в тихой и спокойной атмосфере.'
        : 'A spacious, airy room on the garden floor — filled with natural light in a calm, quiet setting.'
    )
  } else if (room.floor === 4) {
    parts.push(
      locale === 'uz'
        ? 'Mansard (tom osti) qavatdagi eng o‘ziga xos xonalarimizdan biri — qiya shift, temir panjarali derazalar va dam olish burchagi bilan uy-villa hissini beradi.'
        : locale === 'ru'
        ? 'Один из самых характерных номеров под крышей (мансарда) — со скошенным потолком, окнами с ковкой и зоной отдыха, создающими атмосферу уюта, как на вилле.'
        : 'One of our most characterful rooms, tucked under the roof (mansard) — sloped ceiling, wrought-iron windows and a seating nook give it a warm, villa-like feel.'
    )
  } else {
    parts.push(
      locale === 'uz'
        ? 'Yuqori qavatda joylashgan keng va yorugʻ xona — zamonaviy bezak, yumshoq ranglar va oʻzbekona naqshli detallar bilan shinam bir muhit sizni kutadi.'
        : locale === 'ru'
        ? 'Просторный светлый номер на верхнем этаже — современная отделка, мягкие тона и узбекские узорчатые детали создают уютную атмосферу.'
        : 'A bright, spacious room on an upper floor — modern finishes, soft tones and subtle Uzbek patterned touches make it feel calm and welcoming.'
    )
  }

  // 2) Ayırt edici özellikler (DB'den kesin)
  if (room.has_jacuzzi) {
    parts.push(
      locale === 'uz'
        ? 'Vanna xonasida jetli jakuzi bilan alohida dam olish imkoniyati.'
        : locale === 'ru'
        ? 'В ванной комнате — джакузи с гидромассажем для особого отдыха.'
        : 'The bathroom features a jetted jacuzzi for a special soak.'
    )
  }
  if (room.has_bathtub) {
    parts.push(
      locale === 'uz'
        ? 'Keng burchakli vanna bilan jihozlangan hammom.'
        : locale === 'ru'
        ? 'Ванная комната с просторной угловой ванной.'
        : 'The bathroom is fitted with a spacious corner bathtub.'
    )
  }
  if (room.is_isolated) {
    parts.push(
      locale === 'uz'
        ? 'Bino burchagida, alohida va eng sokin joylashuv.'
        : locale === 'ru'
        ? 'Угловое расположение — самый уединённый и тихий номер.'
        : 'A corner location — the most private and quiet room.'
    )
  }
  if (room.connecting_room_id) {
    parts.push(
      locale === 'uz'
        ? 'Yonidagi xona bilan ichki eshik orqali bog‘lanishi mumkin — oila yoki guruh uchun qulay (eshikni xodimlar ochadi, ikkala xona alohida bron qilinadi).'
        : locale === 'ru'
        ? 'Может соединяться с соседним номером внутренней дверью — удобно для семьи или группы (дверь открывает персонал, номера бронируются отдельно).'
        : 'Can be linked to the adjacent room via an internal door — handy for a family or group (staff open the door; the rooms are booked separately).'
    )
  }

  // 3) Kapanış — ortak konfor (tüm odalarda gerçek)
  parts.push(
    locale === 'uz'
      ? 'Har bir xonada WiFi, konditsioner, Smart TV va choy/qahva toʻplami; har kuni tozalash va yangi tayyorlangan nonushta bilan — oʻzingizni uydagidek his qilasiz.'
      : locale === 'ru'
      ? 'В каждом номере — WiFi, кондиционер, Smart TV и чайно-кофейный набор; ежедневная уборка и свежий завтрак — чтобы вы чувствовали себя как дома.'
      : 'Every room comes with WiFi, air conditioning, a Smart TV and a tea/coffee set; with daily cleaning and a freshly prepared breakfast — everything set for you to feel at home.'
  )

  void slug
  return parts.join(' ')
}

function galleryLabel(kind: string, locale: Locale): string {
  const m: Record<string, Record<Locale, string>> = {
    cover: { uz: 'Xona', ru: 'Номер', en: 'Room' },
    bedroom: { uz: 'Yotoqxona', ru: 'Спальня', en: 'Bedroom' },
    bathroom: { uz: 'Hammom', ru: 'Ванная', en: 'Bathroom' },
    jacuzzi: { uz: 'Jakuzi', ru: 'Джакузи', en: 'Jacuzzi' },
    bathtub: { uz: 'Vanna', ru: 'Ванна', en: 'Bathtub' },
    view: { uz: 'Manzara', ru: 'Вид', en: 'View' },
    suite: { uz: 'Dam olish zonasi', ru: 'Зона отдыха', en: 'Lounge' },
    entrance: { uz: 'Kirish', ru: 'Вход', en: 'Entrance' },
  }
  return (m[kind] ?? m.bedroom)[locale]
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string }>
}): Promise<Metadata> {
  const { type: roomNumber, locale } = await params
  const room = await fetchRoom(roomNumber)
  if (!room) return {}
  const loc = (locale as Locale) ?? 'uz'
  const slug = TYPE_SLUG[room.room_type_name] ?? 'luxury'
  const typeName = TYPE_NAMES[slug]?.[loc] ?? slug
  const name = loc === 'ru' ? `Номер ${room.room_number}` : loc === 'en' ? `Room ${room.room_number}` : `${room.room_number}-xona`
  return {
    title: `${name} · ${typeName} — Anor Avenue Hotel`,
    description: buildDescription(room, loc).slice(0, 160),
  }
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; type: string }>
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string }>
}) {
  const { locale: rawLocale, type: roomNumber } = await params
  const { checkIn, checkOut, adults } = await searchParams
  const locale = (rawLocale as Locale) ?? 'uz'
  setRequestLocale(rawLocale)

  // Oda + kapasite + galeri birbirinden bağımsız — tek turda paralel çözülür
  // (galeri URL'deki oda numarasıyla bulunur; fetchRoom aynı numarayı döndürür).
  const [room, capMap, gallery] = await Promise.all([
    fetchRoom(roomNumber),
    fetchRoomCapacities(createServiceClient()),
    getRoomGallery(roomNumber),
  ])
  if (!room) notFound()

  const slug = TYPE_SLUG[room.room_type_name] ?? 'luxury'
  const amenities = AMENITIES[slug]

  // Gerçek kapasite (channex_variants.occupancy)
  const capacity = capMap.get(room.id) ?? room.max_occupancy

  const heroSrc = gallery[0]?.src ?? PHOTO_FALLBACK

  const roomFeatures = {
    jacuzzi: room.has_jacuzzi,
    bathtub: room.has_bathtub,
    isolated: room.is_isolated,
    premiumShower: room.has_jacuzzi,
    viewPremium: room.view_quality === 'premium',
    connecting: room.connecting_room_id != null,
  }

  const roomName =
    locale === 'ru' ? `Номер ${room.room_number}` : locale === 'en' ? `Room ${room.room_number}` : `${room.room_number}-xona`
  const typeName = TYPE_NAMES[slug]?.[locale] ?? slug
  const description = buildDescription(room, locale)

  // Kitap bağlantısı — tarihleri + oda tipini geçir
  const bookParams = new URLSearchParams({ roomType: slug })
  if (checkIn) bookParams.set('checkIn', checkIn)
  if (checkOut) bookParams.set('checkOut', checkOut)
  if (adults) bookParams.set('adults', adults)
  const bookHref = `/${locale}/book?${bookParams.toString()}`

  const occupancyLabel =
    locale === 'uz' ? `${capacity} kishi` : locale === 'ru' ? `${capacity} чел.` : `${capacity} guests`

  const labels = {
    backToRooms: locale === 'uz' ? '← Barcha xonalar' : locale === 'ru' ? '← Все номера' : '← All Rooms',
    from: locale === 'uz' ? 'dan boshlab' : locale === 'ru' ? 'от' : 'from',
    perNight: locale === 'uz' ? '/ bir kecha' : locale === 'ru' ? '/ за ночь' : '/ per night',
    bookNow: locale === 'uz' ? 'Hozir bron qilish' : locale === 'ru' ? 'Забронировать' : 'Book Now',
    amenities: locale === 'uz' ? 'Xona imkoniyatlari' : locale === 'ru' ? 'Удобства номера' : 'Room Amenities',
    description: locale === 'uz' ? 'Xona haqida' : locale === 'ru' ? 'О номере' : 'About the Room',
    gallery: locale === 'uz' ? 'Galereya' : locale === 'ru' ? 'Галерея' : 'Gallery',
    available: locale === 'uz' ? 'mavjud' : locale === 'ru' ? 'доступно' : 'available',
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
            {new Intl.NumberFormat().format(room.effective_price)}{' '}
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
        <div style={{ minHeight: '520px', position: 'relative', overflow: 'hidden' }}>
          <CoverImage src={heroSrc} alt={roomName} sizes="100vw" priority quality={85} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.15) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: 'var(--max-width)',
              margin: '0 auto',
              padding: '2rem var(--spacing-container)',
            }}
          >
            <Link
              href={`/${locale}/rooms`}
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 'var(--text-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'var(--transition-fast)',
              }}
              className="hover:opacity-100"
            >
              {labels.backToRooms}
            </Link>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 'var(--max-width)',
              margin: '0 auto',
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
              {floorLabel(room.floor, locale)} · {typeName}
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
                { icon: '👤', text: occupancyLabel },
                { icon: '🌅', text: viewLabel(room.view_quality, locale) },
                { icon: '🏢', text: floorLabel(room.floor, locale) },
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
          <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Sol sütun */}
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

              {/* Galeri — sadece gerçek foto varsa */}
              {gallery.length > 0 && (
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
                    {gallery.map((item, i) => {
                      const label = galleryLabel(item.kind, locale)
                      return (
                        <div
                          key={item.src}
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
                            alt={label}
                            fill
                            style={{ objectFit: 'cover', objectPosition: 'center' }}
                            sizes="(max-width: 768px) 100vw, 50vw"
                            quality={80}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
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
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

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
                  {amenities.map((a) => (
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
                        {a[locale] ?? a.en}
                      </span>
                    </div>
                  ))}
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
                      {new Intl.NumberFormat().format(room.effective_price)}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', paddingBottom: '2px' }}>
                      UZS {labels.perNight}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }} className="space-y-2">
                  {[
                    { icon: '👤', text: occupancyLabel },
                    { icon: '🌅', text: viewLabel(room.view_quality, locale) },
                    { icon: '🏢', text: floorLabel(room.floor, locale) },
                    { icon: '🏨', text: `${typeName}` },
                  ].map((s) => (
                    <div
                      key={s.text}
                      className="flex items-center gap-2"
                      style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}
                    >
                      <span>{s.icon}</span>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>

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
