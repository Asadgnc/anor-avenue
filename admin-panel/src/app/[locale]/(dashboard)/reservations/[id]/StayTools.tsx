'use client'

// Stay tools on the reservation detail page: extend the stay (with
// alternative-room offers when the current room is booked) and move the
// guest to another room mid-stay. Uses the same actions file as the other
// reservation buttons — no new pages.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  extendStayAction,
  moveRoomAction,
  getMoveTargetsAction,
  type MoveTarget,
} from './actions'
import type { ReservationStatus } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  reservationId: string
  status: ReservationStatus
  checkOut: string
}

type Panel = 'none' | 'extend' | 'move'

export default function StayTools({ reservationId, status, checkOut }: Props) {
  const t = useTranslations('reservations.actions')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [panel, setPanel] = useState<Panel>('none')
  const [newCheckOut, setNewCheckOut] = useState('')
  const [alternatives, setAlternatives] = useState<MoveTarget[] | null>(null)
  const [moveTargets, setMoveTargets] = useState<MoveTarget[] | null>(null)
  const [error, setError] = useState('')

  // Only active stays can be extended or moved
  if (!['pending', 'confirmed', 'checked_in'].includes(status)) return null

  function fmt(n: number) {
    return n.toLocaleString('uz-UZ')
  }

  function openExtend() {
    setPanel(panel === 'extend' ? 'none' : 'extend')
    setAlternatives(null)
    setError('')
  }

  function openMove() {
    setError('')
    if (panel === 'move') {
      setPanel('none')
      return
    }
    setPanel('move')
    setMoveTargets(null)
    startTransition(async () => {
      const res = await getMoveTargetsAction(reservationId)
      if (res.error) setError(res.error)
      else setMoveTargets(res.targets ?? [])
    })
  }

  function submitExtend() {
    if (!newCheckOut) return
    setError('')
    startTransition(async () => {
      const res = await extendStayAction(reservationId, newCheckOut)
      if (res.error) {
        setError(res.error)
      } else if (res.alternatives) {
        setAlternatives(res.alternatives)
      } else {
        setPanel('none')
        router.refresh()
      }
    })
  }

  function submitMove(target: MoveTarget, withExtend: boolean) {
    if (!window.confirm(t('moveConfirm', { room: target.roomNumber }))) return
    setError('')
    startTransition(async () => {
      const res = await moveRoomAction(
        reservationId,
        target.roomId,
        withExtend && newCheckOut ? newCheckOut : undefined
      )
      if (res.error) {
        setError(res.error)
      } else {
        setPanel('none')
        setAlternatives(null)
        router.refresh()
      }
    })
  }

  const listStyle = {
    backgroundColor: 'var(--color-admin-card)',
    boxShadow: 'var(--shadow-card)',
  } as const

  function targetRow(target: MoveTarget, withExtend: boolean) {
    return (
      <button
        key={target.roomId}
        onClick={() => submitMove(target, withExtend)}
        disabled={isPending}
        className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-secondary disabled:opacity-50"
        style={{ border: '1px solid var(--color-admin-border)' }}
      >
        <span className="font-semibold" style={{ color: dash.text }}>
          № {target.roomNumber}
        </span>
        <span style={{ color: 'var(--color-admin-muted)' }}>
          {fmt(target.pricePerNight)} UZS · {t('perNight')}
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={listStyle}>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={openExtend}
          disabled={isPending}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: dash.blue, color: '#fff' }}
        >
          {t('extend')}
        </button>
        <button
          onClick={openMove}
          disabled={isPending}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: dash.primary, color: '#fff' }}
        >
          {t('moveRoom')}
        </button>
      </div>

      {error && (
        <p className="text-sm" style={{ color: dash.red }}>{error}</p>
      )}

      {panel === 'extend' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span style={{ color: 'var(--color-admin-muted)' }}>{t('newCheckOutLabel')}</span>
              <input
                type="date"
                min={checkOut}
                value={newCheckOut}
                onChange={(e) => { setNewCheckOut(e.target.value); setAlternatives(null) }}
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-admin-border)', color: dash.text }}
              />
            </label>
            <button
              onClick={submitExtend}
              disabled={isPending || !newCheckOut}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: dash.green, color: '#fff' }}
            >
              {isPending ? '…' : t('apply')}
            </button>
          </div>

          {alternatives !== null && (
            <div className="space-y-2">
              <p className="text-sm" style={{ color: dash.orange }}>
                {alternatives.length > 0 ? t('extendBlocked') : t('noFreeRooms')}
              </p>
              {alternatives.map((a) => targetRow(a, true))}
            </div>
          )}
        </div>
      )}

      {panel === 'move' && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('chooseRoom')}</p>
          {moveTargets === null && <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>…</p>}
          {moveTargets !== null && moveTargets.length === 0 && (
            <p className="text-sm" style={{ color: dash.orange }}>{t('noFreeRooms')}</p>
          )}
          {moveTargets?.map((a) => targetRow(a, false))}
        </div>
      )}
    </div>
  )
}
