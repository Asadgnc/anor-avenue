'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { submitRoomInspectionAction } from '@/app/[locale]/(dashboard)/housekeeping/actions'
import type { RoomItem } from '@/types/hotel'

interface Props {
  roomId: string
  reservationId?: string
  items: RoomItem[]
}

export default function RoomInspectionForm({ roomId, reservationId, items }: Props) {
  const router = useRouter()
  const t = useTranslations('housekeeping.inspection')
  const [isPending, startTransition] = useTransition()

  const [allOk, setAllOk] = useState(true)
  const [problemNote, setProblemNote] = useState('')
  const [damageOk, setDamageOk] = useState(true)
  const [damageNote, setDamageNote] = useState('')
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function toggleMissing(itemId: string) {
    setMissingIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const missingItems = items
      .filter((it) => missingIds.has(it.id))
      .map((it) => ({ item_id: it.id, name: it.name }))

    startTransition(async () => {
      try {
        await submitRoomInspectionAction({
          roomId,
          reservationId,
          allOk,
          problemNote: allOk ? undefined : problemNote,
          damageOk,
          damageNote: damageOk ? undefined : damageNote,
          missingItems,
        })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('genericError'))
      }
    })
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground outline-none focus:ring-1 focus:ring-primary'
  const toggleCls = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
      active
        ? 'bg-green-100 text-green-700 border-green-300'
        : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
    }`
  const toggleBadCls = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
      active
        ? 'bg-red-100 text-red-700 border-red-300'
        : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
    }`

  if (success) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center space-y-3">
        <p className="text-green-700 font-semibold">{t('savedReport')}</p>
        <button
          onClick={() => { setSuccess(false); setAllOk(true); setDamageOk(true); setMissingIds(new Set()); setProblemNote(''); setDamageNote('') }}
          className="text-sm text-green-600 underline"
        >
          {t('startNew')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-6">
      <h2 className="text-base font-semibold text-foreground">{t('formTitle')}</h2>

      {/* Report problem */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t('generalStatus')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAllOk(true)} className={toggleCls(allOk)}>
            {t('noProblem')}
          </button>
          <button type="button" onClick={() => setAllOk(false)} className={toggleBadCls(!allOk)}>
            {t('hasProblem')}
          </button>
        </div>
        {!allOk && (
          <textarea
            className={inputCls}
            rows={2}
            placeholder={t('describeProblem')}
            value={problemNote}
            onChange={(e) => setProblemNote(e.target.value)}
          />
        )}
      </div>

      {/* Material damage */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t('damageTitle')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDamageOk(true)} className={toggleCls(damageOk)}>
            {t('noDamage')}
          </button>
          <button type="button" onClick={() => setDamageOk(false)} className={toggleBadCls(!damageOk)}>
            {t('hasDamage')}
          </button>
        </div>
        {!damageOk && (
          <textarea
            className={inputCls}
            rows={2}
            placeholder={t('describeDamage')}
            value={damageNote}
            onChange={(e) => setDamageNote(e.target.value)}
          />
        )}
      </div>

      {/* Missing items */}
      {items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t('itemCheck')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => {
              const checked = missingIds.has(item.id)
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    checked
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-background border-border text-foreground hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMissing(item.id)}
                    className="accent-amber-600"
                  />
                  <span>{item.name}</span>
                  {item.expected_qty > 1 && (
                    <span className="ml-auto text-xs text-muted-foreground">×{item.expected_qty}</span>
                  )}
                </label>
              )
            })}
          </div>
          {missingIds.size > 0 && (
            <p className="text-xs text-amber-700 font-medium">
              {t('itemsMarked', { n: missingIds.size })}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
      >
        {isPending ? t('saving') : t('saveReport')}
      </button>
    </form>
  )
}
