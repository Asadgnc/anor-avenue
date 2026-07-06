'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { updateFinanceSettingsAction, type FinanceSettingsState } from './actions'

interface Props {
  usdRate: number
  touristTaxPerNight: number
}

const initState: FinanceSettingsState = {}

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors'
const inputStyle = {
  backgroundColor: 'var(--color-admin-card)',
  color: 'var(--foreground)',
  borderColor: 'var(--color-admin-border)',
}

export default function FinanceSettingsForm({ usdRate, touristTaxPerNight }: Props) {
  const [state, action, pending] = useActionState<FinanceSettingsState, FormData>(
    updateFinanceSettingsAction,
    initState
  )
  const t = useTranslations('settings.financeSettings')

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            {t('usdRate')}
          </label>
          <input
            name="usd_rate"
            type="number"
            step="any"
            min="0"
            defaultValue={usdRate}
            required
            className={inputClass}
            style={inputStyle}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-admin-muted)' }}>
            {t('usdRateHint')}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-admin-muted)' }}>
            {t('touristTax')}
          </label>
          <input
            name="tourist_tax_per_night"
            type="number"
            step="any"
            min="0"
            defaultValue={touristTaxPerNight}
            required
            className={inputClass}
            style={inputStyle}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-admin-muted)' }}>
            {t('touristTaxHint')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {pending ? t('savingButton') : state.success ? t('savedButton') : t('saveButton')}
        </button>
        {state.error && (
          <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>
        )}
      </div>
    </form>
  )
}
