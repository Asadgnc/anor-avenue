'use client'

// Shared top bar visible on all panel pages.
// Left: current section name (resolved from URL)
// Right: pending reservation / payment notifications + user card + language switcher

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Bell, Mail, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Bell (pending reservations) → front-desk roles; Mail (pending payments) → money roles;
// Package (stock need-requests) → admin.
const BELL_ROLES = new Set(['admin', 'receptionist'])
const MAIL_ROLES = new Set(['admin', 'accountant'])
const STOCK_ROLES = new Set(['admin'])

type Props = {
  userName: string
  roleLabel: string
  role: string
  pendingReservations: number
  pendingPayments: number
  stockRequests: number
}

const LOCALE_LABELS: Record<string, string> = {
  ru: 'RU',
  uz: "O'z",
  'uz-cyrl': 'Ўз',
}

export default function AppTopbar({
  userName,
  roleLabel,
  role,
  pendingReservations,
  pendingPayments,
  stockRequests,
}: Props) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('topbar')
  const initial = userName.charAt(0).toUpperCase() || '?'

  const showBell = BELL_ROLES.has(role)
  const showMail = MAIL_ROLES.has(role)
  const showStock = STOCK_ROLES.has(role)

  // Resolve the page title from the current pathname (without locale prefix)
  function resolveTitle(p: string): string {
    const exact: Record<string, string> = {
      '/dashboard':           t('dashboard'),
      '/reservations':        t('calendar'),
      '/reservations/list':   t('reservationList'),
      '/reservations/new':    t('newReservation'),
      '/rooms':               t('rooms'),
      '/guests':              t('guests'),
      '/guests/new':          t('newGuest'),
      '/registrations':       t('registrations'),
      '/housekeeping':        t('housekeeping'),
      '/housekeeping/overview': t('dailyOverview'),
      '/payments':            t('payments'),
      '/reports':             t('reports'),
      '/staff':               t('staff'),
      '/settings':            t('settings'),
    }
    if (exact[p]) return exact[p]
    let best = ''
    for (const route of Object.keys(exact)) {
      if (p.startsWith(route + '/') && route.length > best.length) best = route
    }
    if (best === '/reservations') return t('reservationDetail')
    if (best === '/guests') return t('guestDetail')
    return best ? exact[best] : 'Anor Avenue'
  }

  function switchLocale(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-30 hidden md:flex h-14 items-center justify-between gap-4 px-6 bg-card/80 backdrop-blur border-b border-border">
      <p className="text-sm font-semibold text-foreground truncate">{resolveTitle(pathname)}</p>

      <div className="flex items-center gap-2.5">
        {/* Language switcher */}
        <div className="flex items-center gap-1 mr-1">
          {Object.entries(LOCALE_LABELS).map(([loc, label]) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${
                locale === loc
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {showBell && (
          <Link
            href="/reservations/list?status=pending"
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow duration-150"
            aria-label={t('pendingReservations')}
          >
            <Bell size={15} className="text-foreground" />
            {pendingReservations > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center bg-destructive text-white"
              >
                {pendingReservations > 9 ? '9+' : pendingReservations}
              </Badge>
            )}
          </Link>
        )}

        {showMail && (
          <Link
            href="/payments"
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow duration-150"
            aria-label={t('pendingPayments')}
          >
            <Mail size={15} className="text-foreground" />
            {pendingPayments > 0 && (
              <Badge
                variant="warning"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center"
              >
                {pendingPayments > 9 ? '9+' : pendingPayments}
              </Badge>
            )}
          </Link>
        )}

        {showStock && (
          <Link
            href="/depo"
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-shadow duration-150"
            aria-label={t('stockRequests')}
          >
            <Package size={15} className="text-foreground" />
            {stockRequests > 0 && (
              <Badge
                variant="warning"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 justify-center"
              >
                {stockRequests > 9 ? '9+' : stockRequests}
              </Badge>
            )}
          </Link>
        )}

        <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-card ring-1 ring-foreground/10">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground bg-primary shrink-0">
            {initial}
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold truncate max-w-[140px] text-foreground">
              {userName}
            </p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
