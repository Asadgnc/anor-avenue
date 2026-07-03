'use client'

import { useState, useActionState } from 'react'
import { consumeStockAction, getProductMovementsAction } from './actions'
import type { InventoryProduct, InventoryMovement, InventoryCategory, InventoryDestination } from '@/types/hotel'

const CATEGORIES: Record<InventoryCategory, string> = {
  cleaning:       '🧹 Temizlik',
  kitchen:        '🍳 Mutfak',
  food:           '🥖 Yiyecek',
  beverage:       '🥤 İçecek',
  decoration:     '🌿 Dekorasyon',
  room_furniture: '🛏 Oda Eşyası',
  replacement:    '🔧 Yenileme',
}

const DESTINATIONS: Record<InventoryDestination, string> = {
  room:       'Oda',
  garden:     'Bahçe',
  kitchen:    'Mutfak',
  reception:  'Resepsiyon',
  general:    'Genel',
}

const MOVEMENT_TYPE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  in:  { label: 'Giriş', color: '#15803D', bg: '#DCFCE7' },
  out: { label: 'Çıkış', color: '#B45309', bg: '#FEF3C7' },
}

interface Room {
  id: string
  room_number: string
}

interface Props {
  products: InventoryProduct[]
  rooms: Room[]
  isAdmin: boolean
}

const initialConsumeState = { error: undefined as string | undefined, success: undefined as boolean | undefined }

// ——— Tüketim formu — ayrı bileşen, her mount'ta taze state ———
function ConsumeForm({
  product,
  rooms,
  onClose,
  onAgain,
}: {
  product: InventoryProduct
  rooms: Room[]
  onClose: () => void
  onAgain: () => void
}) {
  const [destination, setDestination] = useState<InventoryDestination>('room')
  const [consumeState, consumeFormAction, isPending] = useActionState(consumeStockAction, initialConsumeState)

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary'

  if (consumeState.success) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-sm text-green-700 font-medium">✓ Stoktan düşüldü</span>
        <button
          onClick={onAgain}
          className="text-xs text-primary underline font-medium"
        >
          Tekrar kullan
        </button>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground underline"
        >
          Kapat
        </button>
      </div>
    )
  }

  return (
    <form action={consumeFormAction} className="flex flex-wrap gap-3 items-end py-2">
      <input type="hidden" name="productId" value={product.id} />

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Miktar</label>
        <input
          name="quantity"
          type="number"
          step="1"
          min="1"
          max={String(product.on_hand)}
          defaultValue="1"
          className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Kullanım Yeri</label>
        <select
          name="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value as InventoryDestination)}
          className={inputCls + ' w-auto'}
        >
          {Object.entries(DESTINATIONS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {destination === 'room' && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Oda No</label>
          <select name="roomId" className={inputCls + ' w-auto'}>
            <option value="">— Seçin</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>#{r.room_number}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Not (opsiyonel)</label>
        <input
          name="note"
          type="text"
          placeholder="Kısa açıklama..."
          className="w-48 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        {consumeState.error && (
          <p className="text-xs text-destructive">{consumeState.error}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-60 transition-opacity"
        >
          {isPending ? 'Kaydediliyor…' : 'Onayla'}
        </button>
      </div>
    </form>
  )
}

// ——— Tek ürün satırı ———
function ProductRow({
  product,
  rooms,
  isAdmin,
}: {
  product: InventoryProduct
  rooms: Room[]
  isAdmin: boolean
}) {
  const [showConsume, setShowConsume] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyData, setHistoryData] = useState<InventoryMovement[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  // Her "Kullan" açılışında key artarak ConsumeForm'u taze mount eder
  const [openKey, setOpenKey] = useState(0)

  const lowStock = product.on_hand <= 3

  function handleOpenConsume() {
    if (showConsume) {
      setShowConsume(false)
    } else {
      setOpenKey((k) => k + 1) // taze mount
      setShowConsume(true)
      setShowHistory(false)
    }
  }

  async function handleShowHistory() {
    if (showHistory) { setShowHistory(false); return }
    setShowHistory(true)
    if (historyData !== null) return
    setHistoryLoading(true)
    const res = await getProductMovementsAction(product.id)
    setHistoryLoading(false)
    if (res.error) setHistoryError(res.error)
    else setHistoryData(res.movements ?? [])
  }

  return (
    <div className="border-b border-border last:border-0">
      {/* Ana satır */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
        <span className="flex-1 text-sm font-medium text-foreground">{product.name}</span>
        <span
          className={`text-sm font-bold tabular-nums min-w-[3rem] text-right ${lowStock ? 'text-red-600' : 'text-foreground'}`}
        >
          {product.on_hand}
          {lowStock && <span className="ml-1 text-xs font-normal text-red-500">⚠ az</span>}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={handleOpenConsume}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
          >
            {showConsume ? 'Kapat' : 'Kullan'}
          </button>
          {isAdmin && (
            <button
              onClick={handleShowHistory}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Geçmiş
            </button>
          )}
        </div>
      </div>

      {/* Tüketim paneli */}
      {showConsume && (
        <div className="px-4 pb-4 pt-1 bg-muted/10 border-t border-border">
          <ConsumeForm
            key={openKey}
            product={product}
            rooms={rooms}
            onClose={() => setShowConsume(false)}
            onAgain={() => {
              // Taze form aç (key artır)
              setOpenKey((k) => k + 1)
            }}
          />
        </div>
      )}

      {/* Admin geçmiş paneli */}
      {isAdmin && showHistory && (
        <div className="px-4 pb-4 pt-1 bg-muted/5 border-t border-border">
          {historyLoading && <p className="text-xs text-muted-foreground py-2">Yükleniyor…</p>}
          {historyError && <p className="text-xs text-destructive py-2">{historyError}</p>}
          {historyData !== null && historyData.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Henüz hareket kaydı yok.</p>
          )}
          {historyData !== null && historyData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-1 pr-3">Tarih</th>
                    <th className="text-left pb-1 pr-3">Tür</th>
                    <th className="text-right pb-1 pr-3">Adet</th>
                    <th className="text-left pb-1 pr-3">Kim</th>
                    <th className="text-left pb-1 pr-3">Nereye</th>
                    <th className="text-left pb-1">Not</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {historyData.map((m) => {
                    const typeInfo = MOVEMENT_TYPE_LABEL[m.type] ?? { label: m.type, color: '#64748B', bg: '#F1F5F9' }
                    const destLabel = m.destination === 'room' && m.rooms?.room_number
                      ? `Oda #${m.rooms.room_number}`
                      : DESTINATIONS[m.destination] ?? m.destination
                    return (
                      <tr key={m.id} className="hover:bg-muted/10">
                        <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">
                          {new Date(m.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-1.5 pr-3">
                          <span
                            style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
                            className="px-1.5 py-0.5 rounded font-semibold"
                          >
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-foreground">
                          {m.quantity}
                        </td>
                        <td className="py-1.5 pr-3 text-foreground">
                          {m.profiles?.full_name ?? '—'}
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{destLabel}</td>
                        <td className="py-1.5 text-muted-foreground">{m.note ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ——— Ana bileşen ———
export default function DepoProductsSection({ products, rooms, isAdmin }: Props) {
  const [searchName, setSearchName] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Henüz stok kaydı yok. Alım girince ürünler otomatik oluşur.
      </p>
    )
  }

  // Filtrele
  const filtered = products.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(searchName.toLowerCase())
    const catMatch = filterCat === 'all' || p.category === filterCat
    return nameMatch && catMatch
  })

  // Kategoriye göre grupla
  const grouped: Partial<Record<InventoryCategory, InventoryProduct[]>> = {}
  for (const p of filtered) {
    if (!grouped[p.category]) grouped[p.category] = []
    grouped[p.category]!.push(p)
  }

  return (
    <div className="space-y-4">
      {/* Filtre satırı */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Ürün ara..."
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary w-52"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Tüm Kategoriler</option>
          {(Object.entries(CATEGORIES) as [InventoryCategory, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(searchName || filterCat !== 'all') && (
          <button
            onClick={() => { setSearchName(''); setFilterCat('all') }}
            className="text-xs text-muted-foreground underline"
          >
            Temizle
          </button>
        )}
        {filtered.length !== products.length && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {products.length} ürün
          </span>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Arama kriterine uygun ürün yok.</p>
      )}

      {(Object.keys(CATEGORIES) as InventoryCategory[])
        .filter((cat) => grouped[cat] && grouped[cat]!.length > 0)
        .map((cat) => (
          <div key={cat} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Kategori başlığı */}
            <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {CATEGORIES[cat]}
              </span>
            </div>

            {/* Ürün başlık satırı */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/10 border-b border-border/50">
              <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ürün Adı</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[3rem] text-right">Adet</span>
              <span className="w-[120px]" />
            </div>

            {/* Ürün satırları */}
            {grouped[cat]!.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                rooms={rooms}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ))}
    </div>
  )
}
