import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'
import LocationSection from '@/components/hotel/LocationSection'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
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
        <HeroSection locale={locale} />
        <RoomsPreviewSection locale={locale} prices={prices} />
        <ExperienceSection locale={locale} />
        <AboutSection locale={locale} />
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

const roomData = [
  {
    key: 'standard' as const,
    floor: '-1',
    amenities: ['WiFi', 'TV', 'A/C'],
    photo: '/hotel-photos/some-delicious-meal-bed-bedroom-side-view.jpg',
  },
  {
    key: 'luxury' as const,
    floor: '2-3',
    amenities: ['WiFi', 'TV', 'A/C', 'Minibar'],
    photo: '/hotel-photos/3d-rendering-beautiful-comtemporary-luxury-bedroom-suite-hotel-with-tv.jpg',
  },
  {
    key: 'mansard' as const,
    floor: '4',
    amenities: ['WiFi', 'TV', 'A/C', 'Minibar', 'Panorama'],
    photo: '/hotel-photos/woman-laying-bed-enjoys-breakfast-tray-hotel-room.jpg',
  },
]

function RoomsPreviewSection({
  locale,
  prices,
}: {
  locale: string
  prices: Record<string, number>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                <Image
                  src={room.photo}
                  alt={room.key}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 33vw"
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
                    href={`/${locale}/rooms`}
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

function ExperienceSection({ locale }: { locale: string }) {
  const labels =
    locale === 'uz'
      ? {
          eyebrow: 'Bizda nima bor',
          heading: 'Anor Avenue tajribasi',
          breakfast: { title: 'Ertalabki nonushta', desc: 'Har kuni yangi tayyorlangan tuxum, mevalar, choy va ko\'p narsa — mehmonxona narxiga kiradi' },
          courtyard: { title: 'Ochiq hovli', desc: 'Yashil bog\'cha va salqin havo, bolalar uchun arg\'imchoq' },
          service: { title: 'Premium xizmat', desc: '24/7 professional xizmat — har qanday savolingizga javob beramiz' },
        }
      : locale === 'ru'
      ? {
          eyebrow: 'Что мы предлагаем',
          heading: 'Опыт Anor Avenue',
          breakfast: { title: 'Завтрак', desc: 'Свежеприготовленный завтрак каждый день — яйца, фрукты, чай и многое другое включено в стоимость' },
          courtyard: { title: 'Открытый дворик', desc: 'Зелёный сад с качелями для приятного отдыха на свежем воздухе' },
          service: { title: 'Премиум сервис', desc: 'Профессиональный сервис 24/7 — мы всегда готовы ответить на ваши вопросы' },
        }
      : {
          eyebrow: 'What we offer',
          heading: 'The Anor Avenue Experience',
          breakfast: { title: 'Fresh Breakfast', desc: 'Freshly prepared eggs, fruits, tea and more every morning — included in your stay' },
          courtyard: { title: 'Open Courtyard', desc: 'A green garden with a swing for relaxing in the fresh air' },
          service: { title: 'Premium Service', desc: '24/7 professional service — we\'re always here to answer your questions' },
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
            <Image
              src="/hotel-photos/hotel-breakfast-real.jpeg"
              alt={labels.breakfast.title}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={85}
            />
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
              <Image
                src="/hotel-photos/hotel-courtyard.jpeg"
                alt={labels.courtyard.title}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={80}
              />
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
              <Image
                src="/hotel-photos/luxury-hotel-reception-hall-lounge-restaurant-with-high-ceiling.jpg"
                alt={labels.service.title}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={80}
              />
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
      </div>
    </section>
  )
}

// ─── About ─────────────────────────────────────────────────────────────────────

function AboutSection({ locale }: { locale: string }) {
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
            <Image
              src="/hotel-photos/senior-woman-assisted-hotel-arrival.jpg"
              alt="Hotel service"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center top' }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={80}
            />
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
