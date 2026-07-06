'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cancelPaymentAction } from './actions'
import { dash } from '@/lib/dashboardTheme'

export default function DeletePaymentButton({
  paymentId,
  reservationId,
}: {
  paymentId: string
  reservationId: string
}) {
  const router = useRouter()
  const t = useTranslations('reservations.deletePayment')
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(t('confirmDialog'))) return
    setPending(true)
    await cancelPaymentAction(paymentId, reservationId)
    setPending(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs px-2 py-1 rounded-lg border transition-opacity hover:opacity-80 disabled:opacity-40"
      style={{ color: dash.red, borderColor: dash.redLight }}
    >
      {pending ? '…' : t('deleteButton')}
    </button>
  )
}
