'use client'

import { useState, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'

const CATEGORY_KEYS = ['cleaning', 'kitchen', 'food', 'beverage', 'decoration', 'room_furniture', 'replacement'] as const
const AREA_KEYS = ['general', 'rooms', 'garden', 'kitchen', 'reception'] as const

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

export interface PurchaseRow {
  id: string
  product_name: string
  category: string
  area: string
  quantity: number
  unit_price: number | null
  total_amount: number
  currency: string
  place: string
  brought_by_name: string | null
  created_at: string
  profiles: { full_name: string } | null
}

interface Props {
  purchases: PurchaseRow[]
}

const PAGE_SIZE = 10

function fmt(amount: number) { return amount.toLocaleString('uz-UZ') }
function fmtUSD(amount: number) { return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` }

export default function FinanceExpenseTable({ purchases }: Props) {
  const t = useTranslations('finance')
  const th = useTranslations('finance.headers')
  const td = useTranslations('finance.detailFields')
  const tc = useTranslations('common')
  const tCat = useTranslations('depo.categories')
  const tArea = useTranslations('depo.areas')
  const locale = useLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const catLabel = (k: string) => tCat.has(k) ? tCat(k) : k
  const areaLabel = (k: string) => tArea.has(k) ? tArea(k) : k
  const som = locale === 'uz' ? "so'm" : locale === 'uz-cyrl' ? 'сўм' : 'сум'
  const fmtSom = (n: number) => `${fmt(n)} ${som}`

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Filters
  const [fDate, setFDate] = useState('')
  const [fProduct, setFProduct] = useState('')
  const [fCategory, setFCategory] = useState('all')
  const [fArea, setFArea] = useState('all')
  const [fPlace, setFPlace] = useState('')
  const [fEntered, setFEntered] = useState('')
  const [fCurrency, setFCurrency] = useState('all')

  const filterInputCls = 'w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'
  const filterSelectCls = 'w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const dateStr = new Date(p.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' })
      if (fDate && !dateStr.includes(fDate)) return false
      if (fProduct && !p.product_name.toLowerCase().includes(fProduct.toLowerCase())) return false
      if (fCategory !== 'all' && p.category !== fCategory) return false
      if (fArea !== 'all' && p.area !== fArea) return false
      if (fPlace && !p.place.toLowerCase().includes(fPlace.toLowerCase())) return false
      const giren = p.brought_by_name || p.profiles?.full_name || ''
      if (fEntered && !giren.toLowerCase().includes(fEntered.toLowerCase())) return false
      if (fCurrency !== 'all' && p.currency !== fCurrency) return false
      return true
    })
  }, [purchases, fDate, fProduct, fCategory, fArea, fPlace, fEntered, fCurrency, dateLocale])

  const hasFilter = fDate || fProduct || fCategory !== 'all' || fArea !== 'all' || fPlace || fEntered || fCurrency !== 'all'

  function clearFilters() {
    setFDate(''); setFProduct(''); setFCategory('all'); setFArea('all')
    setFPlace(''); setFEntered(''); setFCurrency('all')
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {purchases.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">{t('expenseEmpty')}</p>
      ) : (
        <>
          {hasFilter && (
            <div className="px-4 py-2 bg-muted/10 border-b border-border flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {tc('visibleCount', { visible: filtered.length, total: purchases.length })}
              </span>
              <button onClick={clearFilters} className="text-xs text-primary underline">{t('filterClear')}</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Headers */}
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('date')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('product')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('category')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('area')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('place')}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('entered')}</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{th('amount')}</th>
                </tr>
                {/* Filter row */}
                <tr className="border-b border-border/60 bg-muted/10">
                  <td className="px-2 py-1">
                    <input value={fDate} onChange={(e) => { setFDate(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="—" className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input value={fProduct} onChange={(e) => { setFProduct(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="…" className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <select value={fCategory} onChange={(e) => { setFCategory(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                      <option value="all">{t('filterAll')}</option>
                      {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{catLabel(k)}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select value={fArea} onChange={(e) => { setFArea(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                      <option value="all">{t('filterAll')}</option>
                      {AREA_KEYS.map((k) => <option key={k} value={k}>{areaLabel(k)}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input value={fPlace} onChange={(e) => { setFPlace(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="…" className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input value={fEntered} onChange={(e) => { setFEntered(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="…" className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <select value={fCurrency} onChange={(e) => { setFCurrency(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                      <option value="all">{t('filterAll')}</option>
                      <option value="UZS">UZS</option>
                      <option value="USD">USD</option>
                    </select>
                  </td>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((p) => {
                  const isExpanded = expandedId === p.id
                  const giren = p.brought_by_name || p.profiles?.full_name || '—'
                  return (
                    <>
                      <tr
                        key={p.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {new Date(p.created_at).toLocaleDateString(dateLocale, { dateStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="mr-1 text-muted-foreground text-xs">{isExpanded ? '▲' : '▼'}</span>
                          {p.product_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{catLabel(p.category)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{areaLabel(p.area)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.place}</td>
                        <td className="px-4 py-3 text-muted-foreground">{giren}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-red-700">
                          -{p.currency === 'USD' ? fmtUSD(p.total_amount) : fmtSom(p.total_amount)}
                        </td>
                      </tr>

                      {/* Detail row */}
                      {isExpanded && (
                        <tr key={`${p.id}-detail`} className="bg-muted/10">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('dateTime')}</p>
                                <p className="text-foreground">{new Date(p.created_at).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('product')}</p>
                                <p className="text-foreground">{p.product_name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('category')}</p>
                                <p className="text-foreground">{catLabel(p.category)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('area')}</p>
                                <p className="text-foreground">{areaLabel(p.area)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('quantity')}</p>
                                <p className="text-foreground">{p.quantity}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('unitPrice')}</p>
                                <p className="text-foreground">
                                  {p.unit_price != null
                                    ? (p.currency === 'USD' ? fmtUSD(p.unit_price) : fmtSom(p.unit_price))
                                    : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('total')}</p>
                                <p className="text-foreground font-semibold">
                                  {p.currency === 'USD' ? fmtUSD(p.total_amount) : fmtSom(p.total_amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('currency')}</p>
                                <p className="text-foreground">{p.currency}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('place')}</p>
                                <p className="text-foreground">{p.place}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">{td('enteredBy')}</p>
                                <p className="text-foreground">{p.profiles?.full_name ?? '—'}</p>
                              </div>
                              {p.brought_by_name && (
                                <div>
                                  <p className="text-muted-foreground font-medium mb-0.5">{td('broughtBy')}</p>
                                  <p className="text-foreground">{p.brought_by_name}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t('noFilterResult')}
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
                {tc('visibleCount', { visible: visibleCount, total: filtered.length })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  {t('showMore', { n: Math.min(PAGE_SIZE, filtered.length - visibleCount) })}
                </button>
                <button
                  onClick={() => setVisibleCount(filtered.length)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  {t('showAll', { n: filtered.length })}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
