import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import FinanceExpenseTable from './FinanceExpenseTable'
import FinanceIncomeTable from './FinanceIncomeTable'
import type { PurchaseRow } from './FinanceExpenseTable'
import type { PaymentRow } from './FinanceIncomeTable'

function fmt(amount: number) {
  return amount.toLocaleString('uz-UZ')
}

function fmtUSD(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.user_metadata?.role as string | undefined) ?? 'receptionist'
  if (role !== 'admin') redirect('/dashboard?blocked=1')

  const [paymentsResult, purchasesResult] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, currency, method, status, paid_at, reservation_id')
      .eq('status', 'completed')
      .order('paid_at', { ascending: false }),
    supabase
      .from('inventory_purchases')
      .select('id, product_name, category, area, quantity, unit_price, total_amount, currency, place, brought_by_name, created_at, profiles(full_name)')
      .order('created_at', { ascending: false }),
  ])

  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[]
  const purchases = (purchasesResult.data ?? []) as unknown as PurchaseRow[]

  // Gelir toplamları — UZS ve USD ayrı
  const incomeUZS = payments.filter((p) => p.currency === 'UZS').reduce((s, p) => s + Number(p.amount), 0)
  const incomeUSD = payments.filter((p) => p.currency === 'USD').reduce((s, p) => s + Number(p.amount), 0)

  // Gider toplamları
  const expenseUZS = purchases.filter((p) => p.currency === 'UZS').reduce((s, p) => s + Number(p.total_amount), 0)
  const expenseUSD = purchases.filter((p) => p.currency === 'USD').reduce((s, p) => s + Number(p.total_amount), 0)

  const netUZS = incomeUZS - expenseUZS
  const netUSD = incomeUSD - expenseUSD

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Para Akışı</h1>
        <p className="text-sm text-muted-foreground mt-1">Gelir ve gider özeti — UZS/USD ayrı gösterilir</p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={16} className="text-green-600" /> Gelir</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{fmt(incomeUZS)} so&apos;m</p>
            {incomeUSD > 0 && <p className="text-sm text-muted-foreground tabular-nums">{fmtUSD(incomeUSD)} USD</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown size={16} className="text-red-600" /> Gider</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{fmt(expenseUZS)} so&apos;m</p>
            {expenseUSD > 0 && <p className="text-sm text-muted-foreground tabular-nums">{fmtUSD(expenseUSD)} USD</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Minus size={16} className={netUZS >= 0 ? 'text-green-600' : 'text-red-600'} /> Net</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className={`text-2xl font-semibold tabular-nums ${netUZS >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {netUZS >= 0 ? '+' : ''}{fmt(netUZS)} so&apos;m
            </p>
            {(incomeUSD > 0 || expenseUSD > 0) && (
              <p className={`text-sm tabular-nums ${netUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netUSD >= 0 ? '+' : ''}{fmtUSD(netUSD)} USD
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gelir tablosu */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <TrendingUp size={14} /> Gelirler ({payments.length} ödeme)
        </h2>
        <FinanceIncomeTable payments={payments} />
      </section>

      {/* Gider tablosu */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <TrendingDown size={14} /> Giderler — Depo ({purchases.length} alım)
        </h2>
        <FinanceExpenseTable purchases={purchases} />
      </section>
    </div>
  )
}
