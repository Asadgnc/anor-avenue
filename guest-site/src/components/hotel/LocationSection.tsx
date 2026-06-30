import { useTranslations } from 'next-intl'

const locationItems = [
  { key: 'metro', icon: '🚇' },
  { key: 'bazaar', icon: '🛒' },
  { key: 'bus', icon: '🚌' },
  { key: 'dining', icon: '🍽' },
  { key: 'markets', icon: '🏪' },
  { key: 'atm', icon: '💳' },
] as const

export default function LocationSection() {
  const t = useTranslations('location')

  return (
    <section
      style={{
        backgroundColor: 'var(--color-cream)',
        padding: 'var(--spacing-section) var(--spacing-container)',
      }}
    >
      <div style={{ maxWidth: 'var(--max-width)' }} className="mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
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
                marginBottom: '2rem',
              }}
            >
              {t('intro')}
            </p>

            <ul className="flex flex-col gap-3">
              {locationItems.map(({ key, icon }) => (
                <li
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    backgroundColor: 'var(--color-white)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem 1.25rem',
                    border: '1px solid var(--color-cream-dark)',
                  }}
                >
                  <span style={{ fontSize: '1.25rem', lineHeight: '1', flexShrink: 0 }}>{icon}</span>
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: '500',
                    }}
                  >
                    {t(`items.${key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: map embed */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--color-cream-dark)',
              height: '420px',
            }}
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2996.5!2d69.2813!3d41.3425!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDHCsDIwJzMzLjAiTiA2OcKwMTYnNTMuMCJF!5e0!3m2!1sen!2s!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Anor Avenue location"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
