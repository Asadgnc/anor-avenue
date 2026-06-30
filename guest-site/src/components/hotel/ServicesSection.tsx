import { useTranslations } from 'next-intl'

const serviceKeys = [
  { key: 'reception', icon: '🛎' },
  { key: 'housekeeping', icon: '🧹' },
  { key: 'laundry', icon: '👕' },
  { key: 'dining', icon: '🍽' },
  { key: 'rentACar', icon: '🚗' },
  { key: 'staff', icon: '🤝' },
] as const

export default function ServicesSection() {
  const t = useTranslations('services')

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
            }}
          >
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceKeys.map(({ key, icon }) => (
            <div
              key={key}
              style={{
                backgroundColor: 'var(--color-cream)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                border: '1px solid var(--color-cream-dark)',
              }}
            >
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(201,169,110,0.12)',
                  border: '1px solid rgba(201,169,110,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                {icon}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
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
