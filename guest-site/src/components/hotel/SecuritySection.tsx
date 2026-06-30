import { useTranslations } from 'next-intl'

const securityItems = [
  { key: 'cameras', icon: '📹' },
  { key: 'fire', icon: '🧯' },
  { key: 'water', icon: '💧' },
] as const

export default function SecuritySection() {
  const t = useTranslations('security')

  return (
    <section
      style={{
        backgroundColor: 'var(--color-cream)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="text-center mb-10">
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
            }}
          >
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {securityItems.map(({ key, icon }) => (
            <div
              key={key}
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                border: '1px solid var(--color-cream-dark)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>{icon}</div>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: '1.65',
                  fontWeight: '500',
                }}
              >
                {t(`items.${key}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
