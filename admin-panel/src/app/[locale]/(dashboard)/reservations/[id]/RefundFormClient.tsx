'use client'

// Misafire para iadesi formu — yalnızca fazla ödeme (overpaid) durumunda gösterilir.
// AddPaymentFormClient'ın sadeleştirilmiş kopyası; refundPaymentAction'a bağlanır,
// iade negatif tutarlı bir ödeme satırı olarak kaydedilir. Tutar, fazla ödenen
// miktarla ön-doldurulur; personel yöntemi seçip onaylar.

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { refundPaymentAction, type AddPaymentState } from './actions'
import { dash } from '@/lib/dashboardTheme'
import FiscalQrScanButton, { isFiscalUrl } from '@/components/admin/FiscalQrScanButton'

export default function RefundFormClient({
  reservationId,
  defaultAmount,
}: {
  reservationId: string
  defaultAmount: number
}) {
  const router = useRouter()
  const t = useTranslations('reservations.refund')
  const tm = useTranslations('reservations.methods')
  const tf = useTranslations('fiscalScan')
  const boundAction = refundPaymentAction.bind(null, reservationId)
  const [state, action, isPending] = useActionState<AddPaymentState, FormData>(boundAction, {})
  const [fiscalUrl, setFiscalUrl] = useState('')

  const methods = [
    { value: 'cash', label: tm('cash') },
    { value: 'card', label: tm('card') },
    { value: 'transfer', label: tm('transfer') },
    { value: 'payme', label: 'Payme' },
    { value: 'click', label: 'Click' },
    { value: 'uzum', label: 'Uzum' },
  ] as const

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => router.refresh(), 800)
      return () => clearTimeout(timer)
    }
  }, [state.success, router])

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1'
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
      {/* Amount (ön-dolu = fazla ödenen) */}
      <div className="w-36">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{t('amountLabel')}</label>
        <input
          name="amount"
          type="number"
          min="1"
          step="any"
          defaultValue={defaultAmount > 0 ? Math.round(defaultAmount) : ''}
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
        <select name="method" required disabled={isPending} className={inputClass} style={inputStyle}>
          {methods.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div className="flex-1 min-w-32">
        <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{t('noteLabel')}</label>
        <input name="notes" type="text" disabled={isPending} className={inputClass} style={inputStyle} />
      </div>

      {/* Confirm */}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 shrink-0"
        style={{ backgroundColor: dash.blue, color: '#FFFFFF' }}
      >
        {isPending ? '…' : t('submit')}
      </button>

      {/* Fiskal chek (Soliq QR) — ixtiyoriy */}
      <div className="w-full flex flex-wrap items-end gap-2 pt-1">
        <input type="hidden" name="fiscal_url" value={fiscalUrl} />
        <FiscalQrScanButton onResult={setFiscalUrl} />
        <div className="flex-1 min-w-48">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-admin-muted)' }}>{tf('manualLabel')}</label>
          <input
            type="url"
            inputMode="url"
            value={fiscalUrl}
            onChange={(e) => setFiscalUrl(e.target.value)}
            placeholder={tf('manualPlaceholder')}
            disabled={isPending}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        {fiscalUrl && (
          isFiscalUrl(fiscalUrl)
            ? <span className="text-xs pb-2" style={{ color: dash.green }}>{tf('captured')}</span>
            : <span className="text-xs pb-2" style={{ color: dash.red }}>{tf('invalid')}</span>
        )}
      </div>

      {state.error && (
        <p className="w-full text-xs mt-1" style={{ color: dash.red }}>{state.error}</p>
      )}
    </form>
  )
}
