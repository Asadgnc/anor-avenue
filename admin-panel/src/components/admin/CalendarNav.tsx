'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface Props {
  prevStart: string
  nextStart: string
  isToday: boolean
  today: string
  startDate: string
  endDate: string
}

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

export default function CalendarNav({ prevStart, nextStart, isToday, today, startDate, endDate }: Props) {
  const locale = useLocale()
  const t = useTranslations('reservations.calendar.nav')
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(LOCALE_BCP47[locale] ?? 'ru-RU', { day: 'numeric', month: 'short' })

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/reservations?start=${prevStart}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', boxShadow: 'var(--shadow-card)' }}
      >
        <ChevronLeft size={14} />
        {t('prev')}
      </Link>

      {!isToday && (
        <Link
          href={`/reservations?start=${today}`}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-accent)', boxShadow: 'var(--shadow-card)' }}
        >
          <Calendar size={14} />
          {t('today')}
        </Link>
      )}

      <span className="text-sm px-3" style={{ color: 'var(--color-admin-muted)' }}>
        {fmt(startDate)} — {fmt(endDate)}
      </span>

      <Link
        href={`/reservations?start=${nextStart}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', boxShadow: 'var(--shadow-card)' }}
      >
        {t('next')}
        <ChevronRight size={14} />
      </Link>
    </div>
  )
}
