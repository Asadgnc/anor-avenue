'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { updateReservationStatusAction } from './actions'
import type { ReservationStatus } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  reservationId: string
  status: ReservationStatus
  checkIn: string
}

type ActionKey = 'confirm' | 'noShow' | 'cancel' | 'checkIn' | 'checkOut'

interface ActionButton {
  key: ActionKey
  newStatus: ReservationStatus
  color: string
}

function getButtons(status: ReservationStatus, checkIn: string): ActionButton[] {
  const today = new Date().toISOString().split('T')[0]
  const isPastCheckIn = today > checkIn

  switch (status) {
    case 'pending':
      return [
        { key: 'confirm', newStatus: 'confirmed', color: dash.blue },
        ...(isPastCheckIn ? [{ key: 'noShow' as ActionKey, newStatus: 'no_show' as ReservationStatus, color: dash.primary }] : []),
        { key: 'cancel', newStatus: 'cancelled', color: dash.red },
      ]
    case 'confirmed':
      return [
        { key: 'checkIn', newStatus: 'checked_in', color: dash.green },
        ...(isPastCheckIn ? [{ key: 'noShow' as ActionKey, newStatus: 'no_show' as ReservationStatus, color: dash.primary }] : []),
        { key: 'cancel', newStatus: 'cancelled', color: dash.red },
      ]
    case 'checked_in':
      return [
        { key: 'checkOut', newStatus: 'checked_out', color: dash.orange },
      ]
    default:
      return []
  }
}

export default function ReservationActions({ reservationId, status, checkIn }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const t = useTranslations('reservations.actions')
  const buttons = getButtons(status, checkIn)

  if (buttons.length === 0) return null

  function handleClick(btn: ActionButton) {
    if (!window.confirm(t(`confirmDialogs.${btn.key}`))) return
    startTransition(async () => {
      const result = await updateReservationStatusAction(reservationId, btn.newStatus)
      if (result.error) {
        alert(t('errorPrefix') + result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div
      className="rounded-2xl p-4 flex flex-wrap gap-3"
      style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="w-full text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-admin-muted)' }}>
        {t('title')}
      </p>
      {buttons.map((btn) => (
        <button
          key={btn.newStatus}
          onClick={() => handleClick(btn)}
          disabled={isPending}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: btn.color, color: '#fff' }}
        >
          {isPending ? '...' : t(btn.key)}
        </button>
      ))}
    </div>
  )
}
