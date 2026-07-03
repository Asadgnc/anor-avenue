'use client'

import { useState, useMemo } from 'react'

export interface PaymentRow {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  paid_at: string | null
  reservation_id: string
}

interface Props {
  payments: PaymentRow[]
}

const PAGE_SIZE = 10

function fmt(amount: number) { return amount.toLocaleString('uz-UZ') }
function fmtUSD(amount: number) { return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` }

export default function FinanceIncomeTable({ payments }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Filtreler
  const [fDate, setFDate] = useState('')
  const [fMethod, setFMethod] = useState('')
  const [fCurrency, setFCurrency] = useState('all')

  const filterInputCls = 'w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'
  const filterSelectCls = 'w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const dateStr = p.paid_at ? new Date(p.paid_at).toLocaleDateString('tr-TR', { dateStyle: 'short' }) : ''
      if (fDate && !dateStr.includes(fDate)) return false
      if (fMethod && !p.method.toLowerCase().includes(fMethod.toLowerCase())) return false
      if (fCurrency !== 'all' && p.currency !== fCurrency) return false
      return true
    })
  }, [payments, fDate, fMethod, fCurrency])

  const hasFilter = fDate || fMethod || fCurrency !== 'all'

  function clearFilters() {
    setFDate(''); setFMethod(''); setFCurrency('all')
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {payments.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">Henüz tamamlanmış ödeme yok.</p>
      ) : (
        <>
          {hasFilter && (
            <div className="px-4 py-2 bg-muted/10 border-b border-border flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {filtered.length} / {payments.length} kayıt
              </span>
              <button onClick={clearFilters} className="text-xs text-primary underline">Filtreleri temizle</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarih</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yöntem</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tutar</th>
                </tr>
                {/* Filtre satırı */}
                <tr className="border-b border-border/60 bg-muted/10">
                  <td className="px-2 py-1">
                    <input value={fDate} onChange={(e) => { setFDate(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="gg.aa" className={filterInputCls} />
                  </td>
                  <td className="px-2 py-1">
                    <input value={fMethod} onChange={(e) => { setFMethod(e.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="nakit, payme..." className={filterInputCls} />
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
                {visible.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('tr-TR', { dateStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground capitalize">{p.method}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">
                      +{p.currency === 'USD' ? fmtUSD(p.amount) : `${fmt(p.amount)} so'm`}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Filtre kriterine uygun kayıt yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
