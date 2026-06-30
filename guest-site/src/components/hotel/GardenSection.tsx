import { useTranslations } from 'next-intl'

export default function GardenSection() {
  const t = useTranslations('garden')

  return (
    <section
      style={{
        backgroundColor: 'var(--color-charcoal)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: large decorative icon block */}
          <div
            style={{
              backgroundColor: 'var(--color-charcoal-soft)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(201,169,110,0.15)',
              height: '340px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '3.5rem' }}>
              <span>🌿</span>
              <span>🌳</span>
              <span>🐦</span>
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center',
                maxWidth: '200px',
                lineHeight: '1.6',
              }}
            >
              {t('smokingArea')}
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
                color: 'var(--color-white)',
                fontWeight: '700',
                marginBottom: '1.25rem',
              }}
            >
              {t('title')}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.65)',
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
