import { useTranslations } from 'next-intl'

const kitchenCards = [
  { key: 'open247', icon: '🕐' },
  { key: 'equipped', icon: '🍳' },
  { key: 'space', icon: '☀️' },
  { key: 'vending', icon: '🧃' },
] as const

export default function KitchenSection() {
  const t = useTranslations('kitchen')

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
            {t('eyebrow')}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--color-text-primary)',
              fontWeight: '700',
              marginBottom: '1rem',
            }}
          >
            {t('title')}
          </h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-base)',
              lineHeight: '1.7',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            {t('intro')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kitchenCards.map(({ key, icon }) => (
            <div
              key={key}
              style={{
                backgroundColor: 'var(--color-cream)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                border: '1px solid var(--color-cream-dark)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{icon}</div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-lg)',
                  color: 'var(--color-text-primary)',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                }}
              >
                {t(`${key}.title`)}
              </h3>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: '1.65',
                }}
              >
                {t(`${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
