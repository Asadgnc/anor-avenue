'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'

const localeLabels: Record<string, string> = {
  uz: 'UZ',
  ru: 'RU',
  en: 'EN',
}

export default function Navbar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  function switchLocale(newLocale: string) {
    // Replace current locale prefix with new one
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
  }

  const links = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/rooms`, label: t('rooms') },
    { href: `/${locale}/amenities`, label: t('amenities') },
    { href: `/${locale}#about`, label: t('about') },
    { href: `/${locale}#contact`, label: t('contact') },
  ]

  return (
    <header
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid var(--color-cream-dark)',
        backdropFilter: 'blur(8px)',
      }}
      className="sticky top-0 z-50"
    >
      <div
        style={{ maxWidth: 'var(--max-width)', padding: '0 var(--spacing-container)' }}
        className="mx-auto flex items-center justify-between h-16"
      >
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-dark)', fontSize: '1.25rem' }}
            className="font-bold tracking-wide"
          >
            Anor Avenue
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}
              className="hover:text-[var(--color-gold-dark)] transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Language switcher */}
          <div className="hidden md:flex items-center gap-1">
            {Object.keys(localeLabels).map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                style={{
                  color: loc === locale ? 'var(--color-gold-dark)' : 'var(--color-text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: loc === locale ? '700' : '500',
                }}
                className="px-1.5 hover:text-[var(--color-gold)] transition-colors"
              >
                {localeLabels[loc]}
              </button>
            ))}
          </div>

          {/* Book button */}
          <Link
            href={`/${locale}/book`}
            style={{
              backgroundColor: 'var(--color-gold)',
              color: 'var(--color-white)',
              fontSize: 'var(--text-sm)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 1.25rem',
              transition: 'var(--transition-fast)',
            }}
            className="hidden md:block font-semibold hover:opacity-90"
          >
            {t('book')}
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2"
            style={{ color: 'var(--color-text-primary)' }}
            aria-label="Menu"
          >
            <div className="flex flex-col gap-1.5">
              <span
                style={{ backgroundColor: 'currentColor', height: '2px', width: '22px', display: 'block',
                  transform: menuOpen ? 'translateY(7px) rotate(45deg)' : '', transition: 'transform 0.2s' }}
              />
              <span
                style={{ backgroundColor: 'currentColor', height: '2px', width: '22px', display: 'block',
                  opacity: menuOpen ? 0 : 1, transition: 'opacity 0.2s' }}
              />
              <span
                style={{ backgroundColor: 'currentColor', height: '2px', width: '22px', display: 'block',
                  transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : '', transition: 'transform 0.2s' }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{ backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-cream-dark)' }}
          className="md:hidden px-6 py-4 flex flex-col gap-4"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{ color: 'var(--color-text-secondary)' }}
              className="font-medium"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-2">
            {Object.keys(localeLabels).map((loc) => (
              <button
                key={loc}
                onClick={() => { switchLocale(loc); setMenuOpen(false) }}
                style={{
                  color: loc === locale ? 'var(--color-gold-dark)' : 'var(--color-text-muted)',
                  fontWeight: loc === locale ? '700' : '500',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {localeLabels[loc]}
              </button>
            ))}
          </div>
          <Link
            href={`/${locale}/book`}
            onClick={() => setMenuOpen(false)}
            style={{
              backgroundColor: 'var(--color-gold)',
              color: 'var(--color-white)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.5rem',
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            {t('book')}
          </Link>
        </div>
      )}
    </header>
  )
}
