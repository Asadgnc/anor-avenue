'use client'

import { useActionState, useState, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { addPurchaseAction } from './actions'
import type { InventoryPurchase } from '@/types/hotel'

const CATEGORY_KEYS = ['cleaning', 'kitchen', 'food', 'beverage', 'decoration', 'room_furniture', 'replacement'] as const
const AREA_KEYS = ['general', 'rooms', 'garden', 'kitchen', 'reception'] as const

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

interface Profile { id: string; full_name: string }

interface Props {
  purchases: InventoryPurchase[]
  profiles: Profile[]
  areaFilter?: string
}

const initialState = { error: undefined as string | undefined, success: undefined as boolean | undefined }

const PAGE_SIZE = 10

export default function DepoClient({ purchases, profiles, areaFilter }: Props) {
  const [state, action, isPending] = useActionState(addPurchaseAction, initialState)
  const [showForm, setShowForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')

  const t = useTranslations('depo')
  const tc = useTranslations('common')
  const tCat = useTranslations('depo.categories')
  const tArea = useTranslations('depo.areas')
  const tList = useTranslations('depo.purchaseList')
  const locale = useLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const catLabel = (key: string) => tCat.has(key) ? tCat(key) : key
  const areaLabel = (key: string) => tArea.has(key) ? tArea(key) : key

  // Filtreler
  const [fDate, setFDate] = useState('')
  const [fProduct, setFProduct] = useState('')
  const [fCategory, setFCategory] = useState('all')
  const [fArea, setFArea] = useState('all')
  const [fQty, setFQty] = useState('')
  const [fAmount, setFAmount] = useState('')
  const [fPlace, setFPlace] = useState('')
  const [fEntered, setFEntered] = useState('')

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const formatAmount = (amount: number, currency: string) =>
    currency === 'USD'
      ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : `${amount.toLocaleString('uz-UZ')} so'm`

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary'
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1'
  const filterInputCls = 'w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'
  const filterSelectCls = 'w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'

  // Filter
  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const dateStr = new Date(p.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' })
      if (fDate && !dateStr.includes(fDate)) return false
      if (fProduct && !p.product_name.toLowerCase().includes(fProduct.toLowerCase())) return false
      if (fCategory !== 'all' && p.category !== fCategory) return false
      if (fArea !== 'all' && p.area !== fArea) return false
      if (fQty && !String(p.quantity).includes(fQty)) return false
      if (fAmount && !String(p.total_amount).includes(fAmount)) return false
      if (fPlace && !p.place.toLowerCase().includes(fPlace.toLowerCase())) return false
      const giren = p.brought_by_name || p.profiles?.full_name || ''
      if (fEntered && !giren.toLowerCase().includes(fEntered.toLowerCase())) return false
      return true
    })
  }, [purchases, fDate, fProduct, fCategory, fArea, fQty, fAmount, fPlace, fEntered, dateLocale])

  const hasFilter = fDate || fProduct || fCategory !== 'all' || fArea !== 'all' || fQty || fAmount || fPlace || fEntered

  function clearFilters() {
    setFDate(''); setFProduct(''); setFCategory('all'); setFArea('all')
    setFQty(''); setFAmount(''); setFPlace(''); setFEntered('')
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="space-y-6">
      {/* New purchase button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? t('cancelButton') : t('newPurchaseButton')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">{t('newPurchaseTitle')}</h2>

          {/* Category first */}
          {!selectedCategory ? (
            <div className="space-y-2">
              <p className={labelCls}>{t('categorySelectLabel')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORY_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className="px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
                  >
                    {catLabel(key)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="category" value={selectedCategory} />

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {t('fields.area')}: <span className="text-primary">{catLabel(selectedCategory)}</span>
                </p>
                <button type="button" onClick={() => setSelectedCategory('')} className="text-xs text-muted-foreground underline">
                  {t('changeCategory')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('fields.productName')}</label>
                  <input name="product_name" className={inputCls} required placeholder={t('productNamePlaceholder')} />
                </div>
                <div>
                  <label className={labelCls}>{t('fields.place')}</label>
                  <input name="place" className={inputCls} required placeholder={t('placePlaceholder')} />
                </div>
                <div>
                  <label className={labelCls}>{t('fields.quantity')}</label>
                  <input name="quantity" type="number" step="0.01" min="0.01" className={inputCls} required placeholder="1" />
                </div>
                <div>
                  <label className={labelCls}>{t('fields.unitPrice')}</label>
                  <input name="unit_price" type="number" step="0.01" min="0" className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>{t('fields.totalAmount')}</label>
                  <input name="total_amount" type="number" step="0.01" min="0.01" className={inputCls} required placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>{t('fields.currency')}</label>
                  <select name="currency" className={inputCls}>
                    <option value="UZS">{t('currencyUzs')}</option>
                    <option value="USD">{t('currencyUsd')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('fields.area')}</label>
                  <select name="area" defaultValue={areaFilter ?? 'general'} className={inputCls}>
                    {AREA_KEYS.map((k) => (
                      <option key={k} value={k}>{areaLabel(k)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('fields.broughtBy')}</label>
                  <select name="brought_by_name" className={inputCls}>
                    <option value="">{t('broughtByDefault')}</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.full_name}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              {state.success && (
                <p className="text-sm text-green-600">{t('savedMessage')}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              >
                {isPending ? tc('saving') : tc('save')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Purchase history table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {purchases.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{tList('empty')}</p>
        ) : (
          <>
            {/* Filter summary */}
            {hasFilter && (
              <div className="px-4 py-2 bg-muted/10 border-b border-border flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {tList('filterResult', { visible: filtered.length, total: purchases.length })}
                </span>
                <button onClick={clearFilters} className="text-xs text-primary underline">
                  {tc('filterClear')}
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Column headers */}
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.date')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.product')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.category')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.area')}</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.quantity')}</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.amount')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.place')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{tList('headers.entered')}</th>
                  </tr>
                  {/* Filter row */}
                  <tr className="border-b border-border/60 bg-muted/10">
                    <td className="px-2 py-1">
                      <input value={fDate} onChange={(e) => { setFDate(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder={t('filterDatePlaceholder')} className={filterInputCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fProduct} onChange={(e) => { setFProduct(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder={t('filterSearchPlaceholder')} className={filterInputCls} />
                    </td>
                    <td className="px-2 py-1">
                      <select value={fCategory} onChange={(e) => { setFCategory(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                        <option value="all">{tc('all')}</option>
                        {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{catLabel(k)}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={fArea} onChange={(e) => { setFArea(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                        <option value="all">{tc('all')}</option>
                        {AREA_KEYS.map((k) => <option key={k} value={k}>{areaLabel(k)}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input value={fQty} onChange={(e) => { setFQty(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder={t('filterAnyPlaceholder')} className={filterInputCls + ' text-right'} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fAmount} onChange={(e) => { setFAmount(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder={t('filterAnyPlaceholder')} className={filterInputCls + ' text-right'} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fPlace} onChange={(e) => { setFPlace(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder={t('filterSearchPlaceholder')} className={filterInputCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fEntered} onChange={(e) => { setFEntered(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder={t('filterSearchPlaceholder')} className={filterInputCls} />
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {new Date(p.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.product_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{catLabel(p.category)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{areaLabel(p.area)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatAmount(p.total_amount, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.place}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.brought_by_name || (p.profiles?.full_name ?? '—')}
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        {tList('noFilterResult')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > visibleCount && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {tList('filterResult', { visible: visibleCount, total: filtered.length })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {tList('showMore', { n: Math.min(PAGE_SIZE, filtered.length - visibleCount) })}
                  </button>
                  <button
                    onClick={() => setVisibleCount(filtered.length)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    {tList('showAll', { n: filtered.length })}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
