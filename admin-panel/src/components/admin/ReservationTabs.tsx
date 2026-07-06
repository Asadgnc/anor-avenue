'use client'

// Shared tab bar for the reservations area: [Calendar] [List] segmented control
// + a primary "New reservation" button. Used on both /reservations and
// /reservations/list so they read as a single tabbed page (Phase 3 consolidation).

import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { CalendarDays, List, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReservationTabs() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const onList = pathname.startsWith('/reservations/list')

  const segment = (href: string, active: boolean, Icon: typeof List, label: string) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors',
        active ? 'text-white' : 'hover:bg-black/5'
      )}
      style={
        active
          ? { backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }
          : { color: 'var(--color-admin-muted)' }
      }
    >
      <Icon size={15} />
      {label}
    </Link>
  )

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className="inline-flex items-center gap-0.5 rounded-lg p-0.5"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        {segment('/reservations', !onList, CalendarDays, t('calendar'))}
        {segment('/reservations/list', onList, List, t('reservationList'))}
      </div>
      <Link
        href="/reservations/new"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        <Plus size={15} />
        {t('newReservation')}
      </Link>
    </div>
  )
}
