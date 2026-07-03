'use client'

import { useState, useMemo } from 'react'

const CATEGORIES: Record<string, string> = {
  cleaning:       'Temizlik',
  kitchen:        'Mutfak',
  food:           'Yiyecek',
  beverage:       'İçecek',
  decoration:     'Dekorasyon',
  room_furniture: 'Oda Eşyası',
  replacement:    'Yenileme',
}

const AREAS: Record<string, string> = {
  general:   'Genel',
  rooms:     'Odalar',
  garden:    'Bahçe',
  kitchen:   'Mutfak',
  reception: 'Resepsiyon',
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Filtreler
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
      const dateStr = new Date(p.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
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
  }, [purchases, fDate, fProduct, fCategory, fArea, fPlace, fEntered, fCurrency])

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
        <p className="p-6 text-sm text-muted-foreground text-center">Henüz depo alımı yok.</p>
      ) : (
        <>
          {hasFilter && (
            <div className="px-4 py-2 bg-muted/10 border-b border-border flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {filtered.length} / {purchases.length} kayıt
              </span>
              <button onClick={clearFilters} className="text-xs text-primary underline">Filtreleri temizle</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Başlıklar */}
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarih</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ürün</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kategori</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yer</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giren</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutar</th>
                </tr>
                {/* Filtre satırı */}
                <tr className="border-b border-border/60 bg-muted/10">
                  <td className="px-2 py-1">
                    <input value={fDate} onChange={(e) => { setFDate(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="gg.aa" className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input value={fProduct} onChange={(e) => { setFProduct(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="Ara..." className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <select value={fCategory} onChange={(e) => { setFCategory(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                      <option value="all">Tümü</option>
                      {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select value={fArea} onChange={(e) => { setFArea(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                      <option value="all">Tümü</option>
                      {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input value={fPlace} onChange={(e) => { setFPlace(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="Ara..." className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input value={fEntered} onChange={(e) => { setFEntered(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="Ara..." className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <select value={fCurrency} onChange={(e) => { setFCurrency(e.target.value); setVisibleCount(PAGE_SIZE) }} className={filterSelectCls}>
                      <option value="all">Tümü</option>
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
                          {new Date(p.created_at).toLocaleDateString('tr-TR', { dateStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="mr-1 text-muted-foreground text-xs">{isExpanded ? '▲' : '▼'}</span>
                          {p.product_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{CATEGORIES[p.category] ?? p.category}</td>
                        <td className="px-4 py-3 text-muted-foreground">{AREAS[p.area] ?? p.area}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.place}</td>
                        <td className="px-4 py-3 text-muted-foreground">{giren}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-red-700">
                          -{p.currency === 'USD' ? fmtUSD(p.total_amount) : `${fmt(p.total_amount)} so'm`}
                        </td>
                      </tr>

                      {/* Detay satırı */}
                      {isExpanded && (
                        <tr key={`${p.id}-detail`} className="bg-muted/10">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Tarih / Saat</p>
                                <p className="text-foreground">{new Date(p.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Ürün</p>
                                <p className="text-foreground">{p.product_name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Kategori</p>
                                <p className="text-foreground">{CATEGORIES[p.category] ?? p.category}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Alan</p>
                                <p className="text-foreground">{AREAS[p.area] ?? p.area}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Miktar</p>
                                <p className="text-foreground">{p.quantity}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Birim Fiyat</p>
                                <p className="text-foreground">
                                  {p.unit_price != null
                                    ? (p.currency === 'USD' ? fmtUSD(p.unit_price) : `${fmt(p.unit_price)} so'm`)
                                    : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Toplam Tutar</p>
                                <p className="text-foreground font-semibold">
                                  {p.currency === 'USD' ? fmtUSD(p.total_amount) : `${fmt(p.total_amount)} so'm`}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Para Birimi</p>
                                <p className="text-foreground">{p.currency}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Alım Yeri</p>
                                <p className="text-foreground">{p.place}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium mb-0.5">Giren (sistem)</p>
                                <p className="text-foreground">{p.profiles?.full_name ?? '—'}</p>
                              </div>
                              {p.brought_by_name && (
                                <div>
                                  <p className="text-muted-foreground font-medium mb-0.5">Getiren (fiziksel)</p>
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
                      Filtre kriterine uygun kayıt yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          {filtered.length > visibleCount && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {visibleCount} / {filtered.length} kayıt gösteriliyor
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  +{Math.min(PAGE_SIZE, filtered.length - visibleCount)} daha göster
                </button>
                <button
                  onClick={() => setVisibleCount(filtered.length)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Tümü ({filtered.length})
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
