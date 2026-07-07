import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'
import LocationSection from '@/components/hotel/LocationSection'
import CoverImage from '@/components/hotel/CoverImage'
import HotelVideo from '@/components/hotel/HotelVideo'
import { supabase } from '@/lib/supabase'
import { getRoomCover, getCommonCover, getCommonGallery, PHOTO_FALLBACK } from '@/lib/roomPhotos'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const { data: roomPriceData } = await supabase
    .from('rooms_with_effective_price')
    .select('room_type_name, effective_price')
    .eq('is_active', true)
    .eq('is_public', true)

  const minPrice = (dbName: string, fallback: number): number => {
    const rows = roomPriceData?.filter((r) => r.room_type_name === dbName) ?? []
    if (rows.length === 0) return fallback
    return Math.min(...rows.map((r) => Number(r.effective_price)))
  }

  const prices = {
    deluxe: minPrice('Deluxe', 500000),
    luxury: minPrice('Luxury', 800000),
  }

  // Tip kartları için temsili odaların gerçek kapakları (yoksa nötr fallback).
  const covers = {
    deluxe: await getRoomCover('202'),
    luxury: await getRoomCover('303'),
  }

  // Gerçek ortak-alan görselleri (kahvaltı / bahçe) — yoksa nötr fallback.
  const [breakfastCover, gardenCover, breakfastGallery, aboutImage] = await Promise.all([
    getCommonCover('breakfast'),
    getCommonCover('garden'),
    getCommonGallery('breakfast'),
    getRoomCover('401'),
  ])

  return (
    <>
      <Navbar />
      <main>
        <HeroSection locale={locale} />
        <RoomsPreviewSection locale={locale} prices={prices} covers={covers} />
        <VideoTourSection locale={locale} />
        <ExperienceSection
          locale={locale}
          breakfastCover={breakfastCover ?? PHOTO_FALLBACK}
          gardenCover={gardenCover ?? PHOTO_FALLBACK}
          breakfastGallery={breakfastGallery.slice(0, 6)}
        />
        <AboutSection locale={locale} image={aboutImage} />
        <LocationSection />
        <ContactSection locale={locale} />
      </main>
      <Footer />
    </>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ locale }: { locale: string }) {
  const t = useTranslations('hero')

  return (
    <section
      style={{
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background photo */}
      <Image
        src="/hotel-photos/hotel-exterior.jpeg"
        alt="Hotel Anor Avenue"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        sizes="100vw"
        priority
        quality={85}
      />
      {/* Dark overlay for text readability */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(20,12,4,0.90) 0%, rgba(42,32,24,0.82) 55%, rgba(20,12,4,0.65) 100%)',
        }}
      />
      {/* Gold radial glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 70% 50%, rgba(201,169,110,0.10) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: 'var(--max-width)',
          padding: '0 var(--spacing-container)',
          position: 'relative',
          zIndex: 1,
        }}
        className="mx-auto w-full"
      >
        <div className="max-w-2xl">
          <p
            style={{
              color: 'var(--color-gold)',
              fontSize: 'var(--text-xs)',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              marginBottom: '1.25rem',
            }}
          >
            Toshkent · O&apos;zbekiston
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-white)',
              fontSize: 'clamp(2.25rem, 6vw, 4rem)',
              lineHeight: '1.15',
              marginBottom: '1.25rem',
              fontWeight: '700',
            }}
          >
            {t('title')}
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 'var(--text-lg)',
              lineHeight: '1.7',
              marginBottom: '2.5rem',
            }}
          >
            {t('subtitle')}
          </p>
          <Link
            href={`/${locale}/rooms`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--color-gold)',
              color: 'var(--color-charcoal)',
              padding: '0.875rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: 'var(--text-base)',
              transition: 'var(--transition-fast)',
              boxShadow: 'var(--shadow-gold)',
            }}
            className="hover:opacity-90"
          >
            {t('cta')}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-12 max-w-3xl">
          <BookingWidget />
        </div>
      </div>
    </section>
  )
}

// ─── Rooms Preview ─────────────────────────────────────────────────────────────

// Her tip için temsili oda numarası — kart "Detaylar" linki bu odanın
// detay sayfasına gider (oda-bazlı detay; tip-slug rotası yok).
const REP_ROOM: Record<string, string> = { deluxe: '202', luxury: '303' }

const roomData = [
  { key: 'deluxe' as const, floor: '2-4', amenities: ['WiFi', 'TV', 'A/C', 'Minibar'] },
  { key: 'luxury' as const, floor: '2-3', amenities: ['WiFi', 'TV', 'A/C', 'Minibar', 'Panorama'] },
]

function RoomsPreviewSection({
  locale,
  prices,
  covers,
}: {
  locale: string
  prices: Record<string, number>
  covers: Record<string, string>
}) {
  const t = useTranslations('rooms')

  return (
    <section
      id="rooms"
      style={{
        backgroundColor: 'var(--color-cream)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="text-center mb-12">
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
            {locale === 'uz' ? 'Xonalar' : locale === 'ru' ? 'Номера' : 'Rooms'}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--color-text-primary)',
              fontWeight: '700',
            }}
          >
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {roomData.map((room) => (
            <div
              key={room.key}
              style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--color-cream-dark)',
              }}
            >
              {/* Room photo */}
              <div style={{ position: 'relative', height: '300px', overflow: 'hidden' }}>
                <Image
                  src={covers[room.key] ?? PHOTO_FALLBACK}
                  alt={room.key}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  quality={80}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    zIndex: 1,
                    backgroundColor: 'rgba(201,169,110,0.2)',
                    border: '1px solid rgba(201,169,110,0.4)',
                    color: 'var(--color-gold-light)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: '600',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {room.floor} {locale === 'uz' ? 'qavat' : locale === 'ru' ? 'этаж' : 'floor'}
                </span>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    color: 'var(--color-text-primary)',
                    fontWeight: '700',
                    marginBottom: '0.5rem',
                  }}
                >
                  {t(`types.${room.key}`)}
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {room.amenities.map((a) => (
                    <span
                      key={a}
                      style={{
                        backgroundColor: 'var(--color-cream)',
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--text-xs)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-cream-dark)',
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                      {t('from')}
                    </span>
                    <p style={{ color: 'var(--color-gold-dark)', fontWeight: '700', fontSize: 'var(--text-lg)' }}>
                      {new Intl.NumberFormat().format(prices[room.key])}{' '}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}>
                        UZS / {t('perNight')}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/rooms/${REP_ROOM[room.key] ?? ''}`}
                    style={{
                      backgroundColor: 'var(--color-charcoal)',
                      color: 'var(--color-white)',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: '600',
                      transition: 'var(--transition-fast)',
                    }}
                    className="hover:opacity-80"
                  >
                    {t('viewDetails')}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Experience ────────────────────────────────────────────────────────────────

function ExperienceSection({
  locale,
  breakfastCover,
  gardenCover,
  breakfastGallery,
}: {
  locale: string
  breakfastCover: string
  gardenCover: string
  breakfastGallery: string[]
}) {
  const labels =
    locale === 'uz'
      ? {
          eyebrow: 'Bizda nima bor',
          heading: 'Anor Avenue tajribasi',
          breakfast: { title: 'Ertalabki nonushta', desc: 'Har tong yangi pishirilgan tuxum, mavsumiy mevalar, xushbo\'y choy va uy noni — hammasi halol, kunlik va mehmonxona narxiga kiradi. Kuningizni to\'kin dasturxon bilan boshlang.' },
          courtyard: { title: 'Yashil hovli', desc: 'Daraxtlar soyasi, qushlar sayrog\'i va shinam o\'tirg\'ich — shahar shovqinidan uzoq, villa hissini beruvchi tinch bir go\'sha.' },
          service: { title: 'Iliq kutib olish', desc: '24/7 resepsiyon, tabassum bilan kutib olish va har qanday savolga tayyor jamoa — o\'zingizni mehmon emas, uyingizdagidek his qilasiz.' },
        }
      : locale === 'ru'
      ? {
          eyebrow: 'Что мы предлагаем',
          heading: 'Опыт Anor Avenue',
          breakfast: { title: 'Утренний завтрак', desc: 'Каждое утро — свежие яйца, сезонные фрукты, ароматный чай и домашний хлеб. Всё халяль, готовится ежедневно и уже включено в стоимость. Начните день за щедрым столом.' },
          courtyard: { title: 'Зелёный дворик', desc: 'Тень деревьев, пение птиц и уютная зона отдыха — вдали от городского шума, с атмосферой собственной виллы.' },
          service: { title: 'Тёплый приём', desc: 'Ресепшн 24/7, встреча с улыбкой и команда, готовая помочь с любым вопросом — чтобы вы чувствовали себя как дома.' },
        }
      : {
          eyebrow: 'What we offer',
          heading: 'The Anor Avenue Experience',
          breakfast: { title: 'Morning Breakfast', desc: 'Every morning: freshly cooked eggs, seasonal fruit, fragrant tea and home-baked bread — all halal, made daily and already included in your stay. Start the day at a generous table.' },
          courtyard: { title: 'A Green Courtyard', desc: 'Shade from the trees, birdsong and a quiet seating nook — far from the city noise, with the feel of your own private villa.' },
          service: { title: 'A Warm Welcome', desc: '24/7 reception, a smile at the door and a team ready for any question — here you feel less like a guest and more like family.' },
        }

  return (
    <section
      style={{
        backgroundColor: 'var(--color-white)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="text-center mb-12">
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
            {labels.eyebrow}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--color-text-primary)',
              fontWeight: '700',
            }}
          >
            {labels.heading}
          </h2>
        </div>

        {/* Editorial 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: large breakfast photo */}
          <div
            style={{
              position: 'relative',
              minHeight: '500px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <CoverImage src={breakfastCover} alt={labels.breakfast.title} sizes="(max-width: 1024px) 100vw, 50vw" quality={85} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2rem',
                left: '2rem',
                right: '2rem',
                zIndex: 1,
              }}
            >
              <p
                style={{
                  color: 'var(--color-gold)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: '0.4rem',
                }}
              >
                ✓ {locale === 'uz' ? 'Narxga kiradi' : locale === 'ru' ? 'Включено' : 'Included'}
              </p>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-white)',
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                }}
              >
                {labels.breakfast.title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
                {labels.breakfast.desc}
              </p>
            </div>
          </div>

          {/* Right: two stacked photos */}
          <div className="flex flex-col gap-4">
            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: '240px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <Image src={gardenCover} alt={labels.courtyard.title} fill style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="(max-width: 1024px) 100vw, 50vw" quality={80} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.5rem',
                  left: '1.5rem',
                  zIndex: 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-white)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: '700',
                    marginBottom: '0.25rem',
                  }}
                >
                  {labels.courtyard.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-sm)' }}>
                  {labels.courtyard.desc}
                </p>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: '240px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <Image src="/videos/resepsiyon.jpg" alt={labels.service.title} fill style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="(max-width: 1024px) 100vw, 50vw" quality={80} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.5rem',
                  left: '1.5rem',
                  zIndex: 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-white)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: '700',
                    marginBottom: '0.25rem',
                  }}
                >
                  {labels.service.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-sm)' }}>
                  {labels.service.desc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kahvaltı foto şeridi — gerçek kahvaltı görselleri */}
        {breakfastGallery.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {breakfastGallery.map((src, i) => (
              <div
                key={src}
                style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
              >
                <Image
                  src={src}
                  alt={`${labels.breakfast.title} ${i + 1}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 640px) 33vw, 16vw"
                  quality={70}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Video Tur ─────────────────────────────────────────────────────────────────

function VideoTourSection({ locale }: { locale: string }) {
  const labels =
    locale === 'uz'
      ? {
          eyebrow: 'Video',
          heading: 'Anor Avenue’ni tomosha qiling',
          intro: 'Bir necha qisqa videoda otelimiz, resepsiyon, xonalar va nonushta bilan tanishing.',
          hotel: 'Otel tanishuvi',
          reception: 'Resepsiyon',
          rooms: 'Xonalarimiz',
          breakfast: 'Nonushta',
        }
      : locale === 'ru'
      ? {
          eyebrow: 'Видео',
          heading: 'Посмотрите Anor Avenue',
          intro: 'Несколько коротких видео познакомят вас с отелем, ресепшн, номерами и завтраком.',
          hotel: 'Знакомство с отелем',
          reception: 'Ресепшн',
          rooms: 'Наши номера',
          breakfast: 'Завтрак',
        }
      : {
          eyebrow: 'Video',
          heading: 'See Anor Avenue in Motion',
          intro: 'A few short clips to introduce the hotel, the reception, the rooms and breakfast.',
          hotel: 'Hotel tour',
          reception: 'Reception',
          rooms: 'Our rooms',
          breakfast: 'Breakfast',
        }

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #2a2018 100%)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="text-center mb-12">
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
            {labels.eyebrow}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--color-white)',
              fontWeight: '700',
              marginBottom: '1rem',
            }}
          >
            {labels.heading}
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 'var(--text-base)',
              maxWidth: '620px',
              margin: '0 auto',
              lineHeight: '1.7',
            }}
          >
            {labels.intro}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HotelVideo src="/videos/otel-tanitim.mp4" poster="/videos/otel-tanitim.jpg" label={labels.hotel} />
          <HotelVideo src="/videos/resepsiyon.mp4" poster="/videos/resepsiyon.jpg" label={labels.reception} />
          <HotelVideo src="/videos/odalar.mp4" poster="/videos/odalar.jpg" label={labels.rooms} />
          <HotelVideo src="/videos/kahvalti.mp4" poster="/videos/kahvalti.jpg" label={labels.breakfast} />
        </div>
      </div>
    </section>
  )
}

// ─── About ─────────────────────────────────────────────────────────────────────

function AboutSection({ locale, image }: { locale: string; image: string }) {
  const features =
    locale === 'uz'
      ? [
          { icon: '🏛', title: 'Markaziy joylashuv', desc: 'Toshkentning eng yaxshi hududida joylashgan' },
          { icon: '✨', title: 'Hashamatli xonalar', desc: '10+ zamonaviy va qulay xonalar' },
          { icon: '🛎', title: '24/7 xizmat', desc: 'Har doim yordam berishga tayyormiz' },
          { icon: '🔒', title: 'Xavfsizlik', desc: 'Kecha-kunduz qorovullik va kamera tizimi' },
        ]
      : locale === 'ru'
      ? [
          { icon: '🏛', title: 'Центральное расположение', desc: 'В лучшем районе Ташкента' },
          { icon: '✨', title: 'Роскошные номера', desc: '10+ современных и комфортабельных номеров' },
          { icon: '🛎', title: 'Сервис 24/7', desc: 'Всегда готовы помочь вам' },
          { icon: '🔒', title: 'Безопасность', desc: 'Круглосуточная охрана и видеонаблюдение' },
        ]
      : [
          { icon: '🏛', title: 'Central Location', desc: 'In the best district of Tashkent' },
          { icon: '✨', title: 'Luxury Rooms', desc: '10+ modern and comfortable rooms' },
          { icon: '🛎', title: '24/7 Service', desc: 'Always here to assist you' },
          { icon: '🔒', title: 'Security', desc: '24-hour security and CCTV system' },
        ]

  return (
    <section
      id="about"
      style={{
        backgroundColor: 'var(--color-charcoal)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: photo */}
          <div
            style={{
              position: 'relative',
              height: '420px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <Image src={image} alt="Anor Avenue" fill style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="(max-width: 1024px) 100vw, 50vw" quality={80} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, transparent 60%, rgba(28,22,14,0.4) 100%)',
              }}
            />
          </div>

          {/* Right: text + feature cards */}
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
              {locale === 'uz' ? 'Biz haqimizda' : locale === 'ru' ? 'О нас' : 'About Us'}
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: 'var(--color-white)',
                fontWeight: '700',
                marginBottom: '2rem',
              }}
            >
              Anor Avenue
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  style={{
                    backgroundColor: 'var(--color-charcoal-soft)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <h3
                    style={{
                      color: 'var(--color-gold-light)',
                      fontWeight: '700',
                      marginBottom: '0.4rem',
                      fontSize: 'var(--text-base)',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: '1.6',
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Contact ───────────────────────────────────────────────────────────────────

function ContactSection({ locale }: { locale: string }) {
  const t = useTranslations('footer')

  return (
    <section
      id="contact"
      style={{
        backgroundColor: 'var(--color-cream)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: '600px' }} className="mx-auto text-center">
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
          {locale === 'uz' ? 'Aloqa' : locale === 'ru' ? 'Контакты' : 'Contact'}
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            color: 'var(--color-text-primary)',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {locale === 'uz'
            ? "Biz bilan bog'laning"
            : locale === 'ru'
            ? 'Свяжитесь с нами'
            : 'Get in touch'}
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="tel:+998901234567"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--color-gold)',
              color: 'var(--color-white)',
              padding: '0.875rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: 'var(--text-base)',
              transition: 'var(--transition-fast)',
            }}
            className="hover:opacity-90"
          >
            📞 {t('phone')}
          </a>
          <Link
            href={`/${locale}/book`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--color-charcoal)',
              color: 'var(--color-white)',
              padding: '0.875rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: 'var(--text-base)',
              transition: 'var(--transition-fast)',
            }}
            className="hover:opacity-80"
          >
            {locale === 'uz'
              ? 'Xonani bron qilish'
              : locale === 'ru'
              ? 'Забронировать'
              : 'Book a Room'}
          </Link>
        </div>

        <p style={{ marginTop: '2rem', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          📍 {t('address')}
        </p>
      </div>
    </section>
  )
}
