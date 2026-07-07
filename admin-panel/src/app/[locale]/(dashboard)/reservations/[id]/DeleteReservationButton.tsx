'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { deleteReservationAction } from './actions'
import { dash } from '@/lib/dashboardTheme'

// Rezervasyonu kalıcı siler — yalnızca admin'e render edilir (page.tsx role kontrolü).
// Server action ayrıca requireRole('admin') ile ikinci savunma hattıdır.
export default function DeleteReservationButton({
  reservationId,
}: {
  reservationId: string
}) {
  const router = useRouter()
  const t = useTranslations('reservations.deleteReservation')
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(t('confirmDialog'))) return
    setPending(true)
    const res = await deleteReservationAction(reservationId)
    setPending(false)
    if (res?.error) {
      alert(res.error)
      return
    }
    router.push('/reservations')
    router.refresh()
  }

  return (
    <div
      className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
      style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: dash.red }}>
          {t('title')}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
          {t('warning')}
        </p>
      </div>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: dash.red, color: '#fff' }}
      >
        {pending ? '…' : t('deleteButton')}
      </button>
    </div>
  )
}
