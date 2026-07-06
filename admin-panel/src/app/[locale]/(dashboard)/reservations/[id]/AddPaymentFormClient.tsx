'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { addPaymentAction, type AddPaymentState } from './actions'
import { dash } from '@/lib/dashboardTheme'

export default function AddPaymentFormClient({ reservationId }: { reservationId: string }) {
  const router = useRouter()
  const t = useTranslations('reservations.addPayment')
  const tm = useTranslations('reservations.methods')
  const tcat = useTranslations('finance.categories')
  const tc = useTranslations('common')
  const boundAction = addPaymentAction.bind(null, reservationId)
  const [state, action, isPending] = useActionState<AddPaymentState, FormData>(boundAction, {})

  const methods = [
    { value: 'cash', label: tm('cash') },
    { value: 'payme', label: 'Payme' },
    { value: 'click', label: 'Click' },
    { value: 'uzum', label: 'Uzum' },
    { value: 'transfer', label: tm('transfer') },
  ] as const

  const categories = [
    { value: 'accommodation', label: tcat('accommodation') },
    { value: 'breakfast', label: tcat('breakfast') },
    { value: 'extra_service', label: tcat('extra_service') },
    { value: 'deposit', label: tcat('deposit') },
    { value: 'other', label: tcat('other') },
  ] as const

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.refresh(), 800)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1"
  const inputStyle = {
    backgroundColor: 'var(--color-admin-bg)',
    border: '1px solid var(--color-admin-border)',
  }

  if (state.success) {
    return (
      <p className="text-sm font-medium" style={{ color: dash.green }}>
        {t('successMessage')}
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-wrap gap-3 items-end">
      {/* Amount */}
      <div className="w-36">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{t('amountLabel')}</label>
        <input
          name="amount"
          type="number"
          min="1"
          step="any"
          placeholder="500000"
          required
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        />
        {state.fieldErrors?.amount && (
          <p className="text-xs mt-0.5" style={{ color: dash.red }}>{state.fieldErrors.amount}</p>
        )}
      </div>

      {/* Method */}
      <div className="w-40">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{t('methodLabel')}</label>
        <select
          name="method"
          required
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        >
          {methods.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Revenue category */}
      <div className="w-44">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{t('categoryLabel')}</label>
        <select
          name="revenue_category"
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div className="flex-1 min-w-32">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{t('noteLabel')}</label>
        <input
          name="notes"
          type="text"
          disabled={isPending}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Save */}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 shrink-0"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
      >
        {isPending ? '…' : tc('save')}
      </button>

      {state.error && (
        <p className="w-full text-xs mt-1" style={{ color: dash.red }}>{state.error}</p>
      )}
    </form>
  )
}
