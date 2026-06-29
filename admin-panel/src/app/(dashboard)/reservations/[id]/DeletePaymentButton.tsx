'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePaymentAction } from './actions'

export default function DeletePaymentButton({
  paymentId,
  reservationId,
}: {
  paymentId: string
  reservationId: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) return
    setPending(true)
    await deletePaymentAction(paymentId, reservationId)
    setPending(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs px-2 py-1 rounded-lg border transition-opacity hover:opacity-80 disabled:opacity-40"
      style={{ color: '#FCA5A5', borderColor: '#450A0A' }}
    >
      {pending ? '…' : 'Sil'}
    </button>
  )
}
