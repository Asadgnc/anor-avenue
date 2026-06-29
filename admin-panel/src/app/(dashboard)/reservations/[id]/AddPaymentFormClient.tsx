'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addPaymentAction, type AddPaymentState } from './actions'

const METHODS = [
  { value: 'cash', label: 'Nakit' },
  { value: 'payme', label: 'Payme' },
  { value: 'click', label: 'Click' },
  { value: 'uzum', label: 'Uzum' },
  { value: 'transfer', label: 'Banka Havalesi' },
] as const

export default function AddPaymentFormClient({ reservationId }: { reservationId: string }) {
  const router = useRouter()
  const boundAction = addPaymentAction.bind(null, reservationId)
  const [state, action, isPending] = useActionState<AddPaymentState, FormData>(boundAction, {})

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.refresh(), 800)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-[#E8E8F0] focus:outline-none focus:ring-1"
  const inputStyle = {
    backgroundColor: 'var(--color-admin-bg)',
    border: '1px solid var(--color-admin-border)',
  }

  if (state.success) {
    return (
      <p className="text-sm font-medium" style={{ color: '#86EFAC' }}>
        ✓ Ödeme kaydedildi, liste güncelleniyor…
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-wrap gap-3 items-end">
      {/* Tutar */}
      <div className="w-36">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>Tutar (UZS)</label>
        <input
          name="amount"
          type="number"
          min="1"
          step="1000"
          placeholder="500000"
          required
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        />
        {state.fieldErrors?.amount && (
          <p className="text-xs mt-0.5" style={{ color: '#FCA5A5' }}>{state.fieldErrors.amount}</p>
        )}
      </div>

      {/* Yöntem */}
      <div className="w-40">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>Yöntem</label>
        <select
          name="method"
          required
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Not */}
      <div className="flex-1 min-w-32">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>Not (isteğe bağlı)</label>
        <input
          name="notes"
          type="text"
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Kaydet */}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 shrink-0"
        style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
      >
        {isPending ? '…' : 'Kaydet'}
      </button>

      {state.error && (
        <p className="w-full text-xs mt-1" style={{ color: '#FCA5A5' }}>{state.error}</p>
      )}
    </form>
  )
}
