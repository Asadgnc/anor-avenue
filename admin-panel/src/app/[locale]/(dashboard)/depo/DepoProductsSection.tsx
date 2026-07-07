'use client'

import { useState, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { consumeStockAction, getProductMovementsAction, deleteInventoryProductAction } from './actions'
import type { InventoryProduct, InventoryMovement, InventoryCategory, InventoryDestination } from '@/types/hotel'

const CATEGORY_EMOJI: Record<InventoryCategory, string> = {
  cleaning:       '🧹',
  kitchen:        '🍳',
  food:           '🥖',
  beverage:       '🥤',
  decoration:     '🌿',
  room_furniture: '🛏',
  replacement:    '🔧',
}

const CATEGORY_KEYS = Object.keys(CATEGORY_EMOJI) as InventoryCategory[]
const DESTINATION_KEYS: InventoryDestination[] = ['room', 'garden', 'kitchen', 'reception', 'general']

const MOVEMENT_TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  in:  { color: '#15803D', bg: '#DCFCE7' },
  out: { color: '#B45309', bg: '#FEF3C7' },
}

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
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

// ——— Consume form — separate component, fresh state on every mount ———
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
  const t = useTranslations('depo.products')
  const tForm = useTranslations('depo.products.consumeForm')
  const tDest = useTranslations('depo.products.destinations')
  const tc = useTranslations('common')

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary'

  if (consumeState.success) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-sm text-green-700 font-medium">{t('consumeSuccess')}</span>
        <button
          onClick={onAgain}
          className="text-xs text-primary underline font-medium"
        >
          {t('useAgainButton')}
        </button>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground underline"
        >
          {t('closeButton')}
        </button>
      </div>
    )
  }

  return (
    <form action={consumeFormAction} className="flex flex-wrap gap-3 items-end py-2">
      <input type="hidden" name="productId" value={product.id} />

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{tForm('quantityLabel')}</label>
        <input
          name="quantity"
          type="number"
          step="any"
          min="1"
          max={String(product.on_hand)}
          defaultValue="1"
          className="w-24 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{tForm('destinationLabel')}</label>
        <select
          name="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value as InventoryDestination)}
          className={inputCls + ' w-auto'}
        >
          {DESTINATION_KEYS.map((k) => (
            <option key={k} value={k}>{tDest(k)}</option>
          ))}
        </select>
      </div>

      {destination === 'room' && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{tForm('roomLabel')}</label>
          <select name="roomId" className={inputCls + ' w-auto'}>
            <option value="">{tc('select')}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>#{r.room_number}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">{tForm('noteLabel')}</label>
        <input
          name="note"
          type="text"
          placeholder={tForm('noteLabel')}
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
          {isPending ? tForm('savingButton') : tForm('confirmButton')}
        </button>
      </div>
    </form>
  )
}

// ——— Single product row ———
function ProductRow({
  product,
  rooms,
  isAdmin,
}: {
  product: InventoryProduct
  rooms: Room[]
  isAdmin: boolean
}) {
  const t = useTranslations('depo.products')
  const tHist = useTranslations('depo.products.history')
  const tDest = useTranslations('depo.products.destinations')
  const locale = useLocale()
  const router = useRouter()
  const [isDeleting, startDelete] = useTransition()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const [showConsume, setShowConsume] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyData, setHistoryData] = useState<InventoryMovement[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  // Each time "Use" opens, incrementing the key remounts ConsumeForm fresh
  const [openKey, setOpenKey] = useState(0)

  const lowStock = product.on_hand <= 3

  function handleOpenConsume() {
    if (showConsume) {
      setShowConsume(false)
    } else {
      setOpenKey((k) => k + 1) // fresh mount
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

  function handleDelete() {
    if (!confirm(t('deleteConfirm'))) return
    startDelete(async () => {
      const res = await deleteInventoryProductAction(product.id)
      if (res?.error) { alert(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="border-b border-border last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
        <span className="flex-1 text-sm font-medium text-foreground">{product.name}</span>
        <span
          className={`text-sm font-bold tabular-nums min-w-[3rem] text-right ${lowStock ? 'text-red-600' : 'text-foreground'}`}
        >
          {product.on_hand}
          {lowStock && <span className="ml-1 text-xs font-normal text-red-500">{t('lowStockWarning')}</span>}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={handleOpenConsume}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
          >
            {showConsume ? t('closeButton') : t('useButton')}
          </button>
          {isAdmin && (
            <button
              onClick={handleShowHistory}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              {t('historyButton')}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? '…' : t('deleteButton')}
            </button>
          )}
        </div>
      </div>

      {/* Consume panel */}
      {showConsume && (
        <div className="px-4 pb-4 pt-1 bg-muted/10 border-t border-border">
          <ConsumeForm
            key={openKey}
            product={product}
            rooms={rooms}
            onClose={() => setShowConsume(false)}
            onAgain={() => {
              // Open a fresh form (increment key)
              setOpenKey((k) => k + 1)
            }}
          />
        </div>
      )}

      {/* Admin history panel */}
      {isAdmin && showHistory && (
        <div className="px-4 pb-4 pt-1 bg-muted/5 border-t border-border">
          {historyLoading && <p className="text-xs text-muted-foreground py-2">{tHist('loadingText')}</p>}
          {historyError && <p className="text-xs text-destructive py-2">{historyError}</p>}
          {historyData !== null && historyData.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">{tHist('noHistory')}</p>
          )}
          {historyData !== null && historyData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-1 pr-3">{tHist('headers.date')}</th>
                    <th className="text-left pb-1 pr-3">{tHist('headers.type')}</th>
                    <th className="text-right pb-1 pr-3">{tHist('headers.quantity')}</th>
                    <th className="text-left pb-1 pr-3">{tHist('headers.who')}</th>
                    <th className="text-left pb-1 pr-3">{tHist('headers.where')}</th>
                    <th className="text-left pb-1">{tHist('headers.note')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {historyData.map((m) => {
                    const typeColor = MOVEMENT_TYPE_COLOR[m.type] ?? { color: '#64748B', bg: '#F1F5F9' }
                    const typeLabel = m.type === 'in' ? tHist('typeIn') : m.type === 'out' ? tHist('typeOut') : m.type
                    const destLabel = m.destination === 'room' && m.rooms?.room_number
                      ? `${tDest('room')} #${m.rooms.room_number}`
                      : (['room','garden','kitchen','reception','general'].includes(m.destination) ? tDest(m.destination) : m.destination)
                    return (
                      <tr key={m.id} className="hover:bg-muted/10">
                        <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">
                          {new Date(m.created_at).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-1.5 pr-3">
                          <span
                            style={{ backgroundColor: typeColor.bg, color: typeColor.color }}
                            className="px-1.5 py-0.5 rounded font-semibold"
                          >
                            {typeLabel}
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

// ——— Main component ———
export default function DepoProductsSection({ products, rooms, isAdmin }: Props) {
  const t = useTranslations('depo.products')
  const tCat = useTranslations('depo.categories')
  const [searchName, setSearchName] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')

  const catLabel = (cat: InventoryCategory) => `${CATEGORY_EMOJI[cat]} ${tCat(cat)}`

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {t('noProducts')}
      </p>
    )
  }

  // Filter
  const filtered = products.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(searchName.toLowerCase())
    const catMatch = filterCat === 'all' || p.category === filterCat
    return nameMatch && catMatch
  })

  // Group by category
  const grouped: Partial<Record<InventoryCategory, InventoryProduct[]>> = {}
  for (const p of filtered) {
    if (!grouped[p.category]) grouped[p.category] = []
    grouped[p.category]!.push(p)
  }

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary w-52"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">{t('allCategories')}</option>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>{catLabel(k)}</option>
          ))}
        </select>
        {(searchName || filterCat !== 'all') && (
          <button
            onClick={() => { setSearchName(''); setFilterCat('all') }}
            className="text-xs text-muted-foreground underline"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">{t('noFilterResult')}</p>
      )}

      {CATEGORY_KEYS
        .filter((cat) => grouped[cat] && grouped[cat]!.length > 0)
        .map((cat) => (
          <div key={cat} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Category header */}
            <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {catLabel(cat)}
              </span>
            </div>

            {/* Product header row */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/10 border-b border-border/50">
              <span className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('nameHeader')}</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[3rem] text-right">{t('quantityHeader')}</span>
              <span className="w-[120px]" />
            </div>

            {/* Product rows */}
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
