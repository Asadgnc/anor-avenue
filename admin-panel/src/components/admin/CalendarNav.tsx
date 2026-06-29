'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface Props {
  prevStart: string
  nextStart: string
  isToday: boolean
  today: string
  startDate: string
  endDate: string
}

export default function CalendarNav({ prevStart, nextStart, isToday, today, startDate, endDate }: Props) {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/reservations?start=${prevStart}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', border: '1px solid var(--color-admin-border)' }}
      >
        <ChevronLeft size={14} />
        Önceki
      </Link>

      {!isToday && (
        <Link
          href={`/reservations?start=${today}`}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-accent)', border: '1px solid var(--color-admin-border)' }}
        >
          <Calendar size={14} />
          Bugün
        </Link>
      )}

      <span className="text-sm px-3" style={{ color: 'var(--color-admin-muted)' }}>
        {fmt(startDate)} — {fmt(endDate)}
      </span>

      <Link
        href={`/reservations?start=${nextStart}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', border: '1px solid var(--color-admin-border)' }}
      >
        Sonraki
        <ChevronRight size={14} />
      </Link>
    </div>
  )
}
