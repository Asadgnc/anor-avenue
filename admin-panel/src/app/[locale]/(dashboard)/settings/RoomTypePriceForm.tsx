'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { updateRoomTypePriceAction, type PriceState } from './actions'

interface Props {
  id: string
  name: string
  basePrice: number
}

const initState: PriceState = {}

export default function RoomTypePriceForm({ id, name, basePrice }: Props) {
  const [state, action, pending] = useActionState<PriceState, FormData>(
    updateRoomTypePriceAction,
    initState
  )
  const t = useTranslations('settings.roomTypePrices')
  const tc = useTranslations('common')

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="roomTypeId" value={id} />
      <span className="text-sm text-foreground min-w-36">{name}</span>
      <div className="flex items-center gap-2 flex-1">
        <input
          name="basePrice"
          type="number"
          defaultValue={basePrice}
          min={1}
          step="any"
          className="px-3 py-2 rounded-lg text-sm border outline-none w-40 tabular-nums"
          style={{
            backgroundColor: 'var(--color-admin-card)',
            color: 'var(--foreground)',
            borderColor: state.error ? '#EF4444' : 'var(--color-admin-border)',
          }}
        />
        <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{t('priceUnit')}</span>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
      >
        {pending ? '…' : state.success ? tc('saved') : tc('save')}
      </button>
      {state.error && (
        <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>
      )}
    </form>
  )
}
