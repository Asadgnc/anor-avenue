import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import Navbar from '@/components/hotel/Navbar'
import Footer from '@/components/hotel/Footer'
import BookingWidget from '@/components/hotel/BookingWidget'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Navbar />
      <main>
        <HeroSection locale={locale} />
        <RoomsPreviewSection locale={locale} />
        <AboutSection locale={locale} />
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
        background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #2a2018 50%, var(--color-charcoal-soft) 100%)',
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gold lines */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(201,169,110,0.08) 0%, transparent 60%)',
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
          {/* Eyebrow */}
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

          {/* Title */}
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

          {/* Subtitle */}
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

          {/* CTA */}
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

        {/* Booking widget */}
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
    price: 350000,
    floor: '-1',
    amenities: ['WiFi', 'TV', 'A/C'],
    gradient: 'linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%)',
  },
  {
    key: 'luxury' as const,
    price: 600000,
    floor: '2-3',
    amenities: ['WiFi', 'TV', 'A/C', 'Minibar'],
    gradient: 'linear-gradient(135deg, #3a2e1e 0%, #2a2018 100%)',
  },
  {
    key: 'mansard' as const,
    price: 850000,
    floor: '4',
    amenities: ['WiFi', 'TV', 'A/C', 'Minibar', 'Panorama'],
    gradient: 'linear-gradient(135deg, #2a1e0e 0%, #1c1208 100%)',
  },
]

function RoomsPreviewSection({ locale }: { locale: string }) {
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
        {/* Heading */}
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

        {/* Cards */}
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
              {/* Color block placeholder (photo goes here later) */}
              <div
                style={{
                  background: room.gradient,
                  height: '200px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '1.25rem',
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

                {/* Amenities */}
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

                {/* Price + CTA */}
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                      {t('from')}
                    </span>
                    <p style={{ color: 'var(--color-gold-dark)', fontWeight: '700', fontSize: 'var(--text-lg)' }}>
                      {new Intl.NumberFormat().format(room.price)}{' '}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: '500' }}>UZS / {t('perNight')}</span>
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

// ─── About ─────────────────────────────────────────────────────────────────────

function AboutSection({ locale }: { locale: string }) {
  const features = locale === 'uz'
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
            {locale === 'uz' ? 'Biz haqimizda' : locale === 'ru' ? 'О нас' : 'About Us'}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--color-white)',
              fontWeight: '700',
            }}
          >
            Anor Avenue
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                backgroundColor: 'var(--color-charcoal-soft)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ color: 'var(--color-gold-light)', fontWeight: '700', marginBottom: '0.5rem' }}>
                {f.title}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
                {f.desc}
              </p>
            </div>
          ))}
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
          {locale === 'uz' ? 'Biz bilan bog\'laning' : locale === 'ru' ? 'Свяжитесь с нами' : 'Get in touch'}
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
            {locale === 'uz' ? 'Xonani bron qilish' : locale === 'ru' ? 'Забронировать' : 'Book a Room'}
          </Link>
        </div>

        <p style={{ marginTop: '2rem', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          📍 {t('address')}
        </p>
      </div>
    </section>
  )
}
