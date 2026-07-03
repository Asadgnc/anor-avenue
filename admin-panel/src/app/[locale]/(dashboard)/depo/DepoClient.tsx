'use client'

import { useActionState, useState, useMemo } from 'react'
import { addPurchaseAction } from './actions'
import type { InventoryPurchase } from '@/types/hotel'

const CATEGORIES: Record<string, string> = {
  cleaning:       'Temizlik',
  kitchen:        'Mutfak',
  food:           'Yiyecek',
  beverage:       'İçecek',
  decoration:     'Dekorasyon',
  room_furniture: 'Oda Eşyası',
  replacement:    'Yenileme',
}

// Genişletildi: Mutfak + Resepsiyon eklendi
const AREAS: Record<string, string> = {
  general:   'Genel',
  rooms:     'Odalar',
  garden:    'Bahçe',
  kitchen:   'Mutfak',
  reception: 'Resepsiyon',
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

  // Filtrele
  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const dateStr = new Date(p.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
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
  }, [purchases, fDate, fProduct, fCategory, fArea, fQty, fAmount, fPlace, fEntered])

  const hasFilter = fDate || fProduct || fCategory !== 'all' || fArea !== 'all' || fQty || fAmount || fPlace || fEntered

  function clearFilters() {
    setFDate(''); setFProduct(''); setFCategory('all'); setFArea('all')
    setFQty(''); setFAmount(''); setFPlace(''); setFEntered('')
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="space-y-6">
      {/* Yeni alım butonu */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {showForm ? 'İptal' : '+ Yeni Alım'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Yeni Depo Alımı</h2>

          {/* Önce kategori */}
          {!selectedCategory ? (
            <div className="space-y-2">
              <p className={labelCls}>Kategori Seçin</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className="px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors text-left"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="category" value={selectedCategory} />

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Kategori: <span className="text-primary">{CATEGORIES[selectedCategory]}</span>
                </p>
                <button type="button" onClick={() => setSelectedCategory('')} className="text-xs text-muted-foreground underline">
                  Değiştir
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ürün Adı *</label>
                  <input name="product_name" className={inputCls} required placeholder="Örn: Deterjan, Ekmek..." />
                </div>
                <div>
                  <label className={labelCls}>Alım Yeri *</label>
                  <input name="place" className={inputCls} required placeholder="Örn: Makro, Koridor bazar..." />
                </div>
                <div>
                  <label className={labelCls}>Miktar *</label>
                  <input name="quantity" type="number" step="0.01" min="0.01" className={inputCls} required placeholder="1" />
                </div>
                <div>
                  <label className={labelCls}>Birim Fiyat (opsiyonel)</label>
                  <input name="unit_price" type="number" step="0.01" min="0" className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Toplam Tutar *</label>
                  <input name="total_amount" type="number" step="0.01" min="0.01" className={inputCls} required placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Para Birimi *</label>
                  <select name="currency" className={inputCls}>
                    <option value="UZS">UZS — So&apos;m</option>
                    <option value="USD">USD — Dolar</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Alan</label>
                  <select name="area" defaultValue={areaFilter ?? 'general'} className={inputCls}>
                    {Object.entries(AREAS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Getiren (opsiyonel)</label>
                  <select name="brought_by_name" className={inputCls}>
                    <option value="">— (giren = getiren)</option>
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
                <p className="text-sm text-green-600">Alım kaydedildi ✓</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              >
                {isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Alım geçmişi tablosu */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {purchases.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">Henüz alım kaydı yok.</p>
        ) : (
          <>
            {/* Filtre özeti */}
            {hasFilter && (
              <div className="px-4 py-2 bg-muted/10 border-b border-border flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} / {purchases.length} kayıt gösteriliyor
                </span>
                <button onClick={clearFilters} className="text-xs text-primary underline">
                  Filtreleri temizle
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Sütun başlıkları */}
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarih</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ürün</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kategori</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alan</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Miktar</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutar</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yer</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giren</th>
                  </tr>
                  {/* Filtre satırı */}
                  <tr className="border-b border-border/60 bg-muted/10">
                    <td className="px-2 py-1">
                      <input value={fDate} onChange={(e) => { setFDate(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="gg.aa.yy" className={filterInputCls} />
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
                      <input value={fQty} onChange={(e) => { setFQty(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="..." className={filterInputCls + ' text-right'} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fAmount} onChange={(e) => { setFAmount(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="..." className={filterInputCls + ' text-right'} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fPlace} onChange={(e) => { setFPlace(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="Ara..." className={filterInputCls} />
                    </td>
                    <td className="px-2 py-1">
                      <input value={fEntered} onChange={(e) => { setFEntered(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="Ara..." className={filterInputCls} />
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {new Date(p.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.product_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{CATEGORIES[p.category] ?? p.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{AREAS[p.area] ?? p.area}</td>
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
    </div>
  )
}
