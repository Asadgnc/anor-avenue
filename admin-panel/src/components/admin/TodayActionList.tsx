'use client'

// "Today" action lists — the heart of the front-desk dashboard.
// Each row is an actionable item: one tap checks the guest in / out or marks
// a no-show, reusing updateReservationStatusAction (same as the detail page).
// Soft-modern static style: fixed shadow, no hover motion, color-only feedback.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { updateReservationStatusAction } from '@/app/[locale]/(dashboard)/reservations/[id]/actions'
import type { ReservationStatus } from '@/types/hotel'

export interface TodayRow {
  id: string
  code: string
  roomNumber: string | null
  guestName: string
  adults: number
  breakfast?: boolean
  expectedTime?: string | null
  balanceDue?: number
}

interface Props {
  mode: 'arrivals' | 'departures' | 'noshow'
  rows: TodayRow[]
}

const MODE_STATUS: Record<Props['mode'], ReservationStatus> = {
  arrivals: 'checked_in',
  departures: 'checked_out',
  noshow: 'no_show',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·'
}

function fmtUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

export default function TodayActionList({ mode, rows }: Props) {
  const t = useTranslations('dashboard.today')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Empty no-show list needs no card at all; arrivals/departures show a calm empty line
  if (mode === 'noshow' && rows.length === 0) return null

  const btnLabel = { arrivals: t('checkInBtn'), departures: t('checkOutBtn'), noshow: t('noShowBtn') }[mode]
  const title = { arrivals: t('arrivalsSection'), departures: t('departuresSection'), noshow: t('noShowSection') }[mode]
  const emptyText = { arrivals: t('noArrivals'), departures: t('noDepartures'), noshow: '' }[mode]

  function handleAction(row: TodayRow) {
    const confirmText = {
      arrivals: t('confirmCheckIn', { name: row.guestName }),
      departures: t('confirmCheckOut', { name: row.guestName }),
      noshow: t('confirmNoShow', { name: row.guestName }),
    }[mode]
    if (!window.confirm(confirmText)) return
    startTransition(async () => {
      const res = await updateReservationStatusAction(row.id, MODE_STATUS[mode])
      if (res.error) alert(res.error)
      else router.refresh()
    })
  }

  const accent =
    mode === 'departures' ? 'text-amber-700' : mode === 'noshow' ? 'text-red-700' : 'text-primary'

  return (
    <section
      className="rounded-2xl bg-card p-4 sm:p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <h2 className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
        {title} ({rows.length})
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              {/* Room number */}
              <span className="w-12 shrink-0 text-center font-mono text-sm font-bold text-foreground">
                {row.roomNumber ?? '—'}
              </span>

              {/* Initials avatar */}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials(row.guestName)}
              </span>

              {/* Guest + meta */}
              <Link href={`/reservations/${row.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{row.guestName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t('personCount', { n: row.adults })}
                  {row.breakfast && <> · {t('breakfastTag')}</>}
                  {row.expectedTime && <> · {t('expectedAt', { time: row.expectedTime.slice(0, 5) })}</>}
                  {row.balanceDue !== undefined && row.balanceDue > 0 && (
                    <> · <span className="font-semibold text-amber-700">{t('balanceDue', { amount: fmtUZS(row.balanceDue) })}</span></>
                  )}
                </p>
              </Link>

              {/* One-tap action */}
              <button
                onClick={() => handleAction(row)}
                disabled={isPending}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                  mode === 'arrivals'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : mode === 'departures'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isPending ? '…' : btnLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
