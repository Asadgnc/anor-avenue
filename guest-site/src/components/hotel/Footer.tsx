import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useLocale } from 'next-intl'

function FooterInner() {
  const t = useTranslations('footer')
  const locale = useLocale()

  return (
    <footer
      style={{ backgroundColor: 'var(--color-charcoal)', color: 'var(--color-text-inverse)' }}
      className="mt-auto"
    >
      <div
        style={{ maxWidth: 'var(--max-width)', padding: 'var(--spacing-section) var(--spacing-container)' }}
        className="mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <h3
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', fontSize: 'var(--text-xl)' }}
              className="font-bold mb-3"
            >
              Anor Avenue
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-sm)', lineHeight: '1.7' }}>
              {t('address')}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4
              style={{ color: 'var(--color-gold-light)', fontSize: 'var(--text-xs)' }}
              className="font-semibold uppercase tracking-widest mb-4"
            >
              {locale === 'uz' ? 'Aloqa' : locale === 'ru' ? 'Контакты' : 'Contact'}
            </h4>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)' }} className="flex flex-col gap-2">
              <span>{t('phone')}: +998 97 789 78 99</span>
            </div>
          </div>

          {/* Nav */}
          <div>
            <h4
              style={{ color: 'var(--color-gold-light)', fontSize: 'var(--text-xs)' }}
              className="font-semibold uppercase tracking-widest mb-4"
            >
              {locale === 'uz' ? 'Sahifalar' : locale === 'ru' ? 'Навигация' : 'Pages'}
            </h4>
            <div className="flex flex-col gap-2">
              {[
                { href: `/${locale}`, label: locale === 'uz' ? 'Bosh sahifa' : locale === 'ru' ? 'Главная' : 'Home' },
                { href: `/${locale}/rooms`, label: locale === 'uz' ? 'Xonalar' : locale === 'ru' ? 'Номера' : 'Rooms' },
                { href: `/${locale}/book`, label: locale === 'uz' ? 'Bron qilish' : locale === 'ru' ? 'Забронировать' : 'Book' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--text-sm)' }}
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2.5rem', paddingTop: '1.5rem' }}
          className="flex flex-col md:flex-row items-center justify-between gap-2"
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'var(--text-xs)' }}>
            © {new Date().getFullYear()} Anor Avenue. {t('rights')}.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default FooterInner
