'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell, Plus, Check } from 'lucide-react'
import { addStockRequestAction, resolveStockRequestAction } from './actions'

export interface StockRequest {
  id: string
  product_name: string
  quantity: number | null
  needed_by: string | null
  note: string | null
  created_at: string
  profiles: { full_name: string } | null
}

const initState = {}

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary'

export default function StockRequestSection({
  requests,
  isAdmin,
}: {
  requests: StockRequest[]
  isAdmin: boolean
}) {
  const t = useTranslations('depo.requests')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<{ error?: string; success?: boolean }, FormData>(
    addStockRequestAction,
    initState
  )
  const [resolving, setResolving] = useState<string | null>(null)

  async function resolve(id: string) {
    setResolving(id)
    await resolveStockRequestAction(id)
    setResolving(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Bell size={14} /> {t('pendingTitle')}
          {requests.length > 0 && (
            <span className="text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center bg-amber-500 text-white">
              {requests.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> {t('button')}
        </button>
      </div>

      {open && (
        <form
          action={action}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
          onSubmit={() => setTimeout(() => setOpen(false), 100)}
        >
          <p className="text-sm font-semibold text-foreground">{t('formTitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">{t('product')}</label>
              <input name="product_name" required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('quantity')}</label>
              <input name="quantity" type="number" step="any" min="0" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('neededBy')}</label>
              <input name="needed_by" type="date" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">{t('note')}</label>
              <input name="note" className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? '…' : t('submit')}
          </button>
          {state.error && <span className="ml-2 text-xs text-destructive">{state.error}</span>}
        </form>
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {r.product_name}
                  {r.quantity != null && <span className="ml-1.5 text-muted-foreground">× {r.quantity}</span>}
                  {r.needed_by && <span className="ml-1.5 text-xs text-amber-700">· {t('neededByShort')} {r.needed_by}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.profiles?.full_name ?? ''}{r.note ? ` — ${r.note}` : ''}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => resolve(r.id)}
                  disabled={resolving === r.id}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-40 transition-colors"
                >
                  <Check size={14} /> {resolving === r.id ? '…' : t('resolve')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
