'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateReservationStatusAction } from './actions'
import type { ReservationStatus } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  reservationId: string
  status: ReservationStatus
  checkIn: string
}

interface ActionButton {
  label: string
  newStatus: ReservationStatus
  color: string
  confirm?: string
}

function getButtons(status: ReservationStatus, checkIn: string): ActionButton[] {
  const today = new Date().toISOString().split('T')[0]
  const isPastCheckIn = today > checkIn

  switch (status) {
    case 'pending':
      return [
        { label: 'Onayla', newStatus: 'confirmed', color: dash.blue, confirm: 'Rezervasyon onaylanacak. Devam edilsin mi?' },
        ...(isPastCheckIn ? [{ label: 'Gelmedi (No-show)', newStatus: 'no_show' as ReservationStatus, color: dash.primary, confirm: 'Misafir gelmedi olarak işaretlenecek. Devam edilsin mi?' }] : []),
        { label: 'İptal Et', newStatus: 'cancelled', color: dash.red, confirm: 'Rezervasyon iptal edilecek. Bu işlem geri alınamaz. Devam edilsin mi?' },
      ]
    case 'confirmed':
      return [
        { label: 'Check-in Yap', newStatus: 'checked_in', color: dash.green, confirm: 'Check-in yapılacak. Devam edilsin mi?' },
        ...(isPastCheckIn ? [{ label: 'Gelmedi (No-show)', newStatus: 'no_show' as ReservationStatus, color: dash.primary, confirm: 'Misafir gelmedi olarak işaretlenecek. Devam edilsin mi?' }] : []),
        { label: 'İptal Et', newStatus: 'cancelled', color: dash.red, confirm: 'Rezervasyon iptal edilecek. Bu işlem geri alınamaz. Devam edilsin mi?' },
      ]
    case 'checked_in':
      return [
        { label: 'Check-out Yap', newStatus: 'checked_out', color: dash.orange, confirm: 'Check-out yapılacak. Devam edilsin mi?' },
      ]
    default:
      return []
  }
}

export default function ReservationActions({ reservationId, status, checkIn }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const buttons = getButtons(status, checkIn)

  if (buttons.length === 0) return null

  function handleClick(btn: ActionButton) {
    if (btn.confirm && !window.confirm(btn.confirm)) return
    startTransition(async () => {
      const result = await updateReservationStatusAction(reservationId, btn.newStatus)
      if (result.error) {
        alert('Hata: ' + result.error)
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
        İşlemler
      </p>
      {buttons.map((btn) => (
        <button
          key={btn.newStatus}
          onClick={() => handleClick(btn)}
          disabled={isPending}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: btn.color, color: '#fff' }}
        >
          {isPending ? '...' : btn.label}
        </button>
      ))}
    </div>
  )
}
