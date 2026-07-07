import { useTranslations } from 'next-intl'
import HotelVideo from '@/components/hotel/HotelVideo'

export default function GardenSection() {
  const t = useTranslations('garden')

  return (
    <section
      style={{
        backgroundColor: 'var(--color-cream)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: real garden video (ambient) + smoking-area note */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <HotelVideo src="/videos/bahce.mp4" poster="/videos/bahce.jpg" mode="ambient" ratio="4 / 5" />
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.6',
              }}
            >
              🚬 {t('smokingArea')}
            </p>
          </div>

          {/* Right: text */}
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
              {t('eyebrow')}
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: 'var(--color-text-primary)',
                fontWeight: '700',
                marginBottom: '1.25rem',
              }}
            >
              {t('title')}
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--text-base)',
                lineHeight: '1.8',
              }}
            >
              {t('intro')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
