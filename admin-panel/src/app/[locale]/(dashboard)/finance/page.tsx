import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown, TrendingUp, Minus, Calendar, FileText } from 'lucide-react'
import FinanceExpenseTable from './FinanceExpenseTable'
import FinanceIncomeTable from './FinanceIncomeTable'
import type { PurchaseRow } from './FinanceExpenseTable'
import type { PaymentRow } from './FinanceIncomeTable'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

function fmt(amount: number) {
  return amount.toLocaleString('uz-UZ')
}

function fmtUSD(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function getMonthStr(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 7)
}

function computeMonthSummary(allPayments: PaymentRow[], allPurchases: PurchaseRow[]) {
  const now = new Date()
  const months: string[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const incomeByMonth: Record<string, number> = {}
  const expenseByMonth: Record<string, number> = {}

  for (const p of allPayments) {
    const m = getMonthStr(p.paid_at || p.created_at)
    if (!m) continue
    if (p.currency === 'UZS') incomeByMonth[m] = (incomeByMonth[m] || 0) + Number(p.amount)
  }

  for (const p of allPurchases) {
    const m = getMonthStr(p.created_at)
    if (!m) continue
    if (p.currency === 'UZS') expenseByMonth[m] = (expenseByMonth[m] || 0) + Number(p.total_amount)
  }

  return months.map((m) => ({
    month: m,
    income: incomeByMonth[m] || 0,
    expense: expenseByMonth[m] || 0,
    net: (incomeByMonth[m] || 0) - (expenseByMonth[m] || 0),
  }))
}

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'bg-blue-500',
  breakfast: 'bg-amber-500',
  extra_service: 'bg-emerald-500',
  deposit: 'bg-purple-500',
  other: 'bg-slate-400',
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = (user.user_metadata?.role as string | undefined) ?? ''
  if (!['admin', 'accountant'].includes(role)) redirect('/dashboard?blocked=1')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('finance')

  const [paymentsResult, purchasesResult] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, currency, method, status, paid_at, created_at, reservation_id, revenue_category')
      .eq('status', 'completed')
      .order('paid_at', { ascending: false }),
    supabase
      .from('inventory_purchases')
      .select('id, product_name, category, area, quantity, unit_price, total_amount, currency, place, brought_by_name, created_at, profiles(full_name)')
      .order('created_at', { ascending: false }),
  ])

  const allPayments = (paymentsResult.data ?? []) as unknown as PaymentRow[]
  const allPurchases = (purchasesResult.data ?? []) as unknown as PurchaseRow[]

  // Month filter
  const params = await searchParams
  const selectedMonth = params.month ?? ''
  const isFiltered = !!selectedMonth && selectedMonth !== 'all'

  const filteredPayments = isFiltered
    ? allPayments.filter((p) => getMonthStr(p.paid_at || p.created_at) === selectedMonth)
    : allPayments

  const filteredPurchases = isFiltered
    ? allPurchases.filter((p) => getMonthStr(p.created_at) === selectedMonth)
    : allPurchases

  // Totals for summary cards
  const incomeUZS = filteredPayments.filter((p) => p.currency === 'UZS').reduce((s, p) => s + Number(p.amount), 0)
  const incomeUSD = filteredPayments.filter((p) => p.currency === 'USD').reduce((s, p) => s + Number(p.amount), 0)
  const expenseUZS = filteredPurchases.filter((p) => p.currency === 'UZS').reduce((s, p) => s + Number(p.total_amount), 0)
  const expenseUSD = filteredPurchases.filter((p) => p.currency === 'USD').reduce((s, p) => s + Number(p.total_amount), 0)
  const netUZS = incomeUZS - expenseUZS
  const netUSD = incomeUSD - expenseUSD

  // Revenue category breakdown (UZS only)
  const catTotals: Record<string, number> = {}
  for (const p of filteredPayments) {
    if (p.currency === 'UZS') {
      const cat = (p as unknown as { revenue_category?: string }).revenue_category || 'accommodation'
      catTotals[cat] = (catTotals[cat] || 0) + Number(p.amount)
    }
  }
  const maxCatAmount = Math.max(...Object.values(catTotals), 1)
  const catKeys = ['accommodation', 'breakfast', 'extra_service', 'deposit', 'other']

  // Monthly summary (last 12 months — always full data regardless of filter)
  const monthSummary = computeMonthSummary(allPayments, allPurchases)
  const hasAnySummaryData = monthSummary.some((m) => m.income > 0 || m.expense > 0)

  // Label helpers
  const som = locale === 'uz' ? "so'm" : locale === 'uz-cyrl' ? 'сўм' : 'сум'
  const fmtSom = (n: number) => `${fmt(n)} ${som}`

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-')
    const d = new Date(Number(y), Number(mo) - 1, 1)
    return d.toLocaleDateString(dateLocale, { year: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-8">
      {/* Header + month filter */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFiltered ? monthLabel(selectedMonth) : t('allTime')}
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <form method="get" className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar size={13} /> {t('monthFilter')}
            </label>
            <input
              name="month"
              type="month"
              defaultValue={selectedMonth}
              className="px-3 py-1.5 rounded-lg text-sm text-foreground bg-card ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t('filterApply')}
            </button>
          </form>
          {isFiltered && (
            <a
              href="/finance"
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-all"
            >
              {t('allTime')}
            </a>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={16} className="text-green-600" /> {t('income')}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{fmtSom(incomeUZS)}</p>
            {incomeUSD > 0 && <p className="text-sm text-muted-foreground tabular-nums">{fmtUSD(incomeUSD)} USD</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown size={16} className="text-red-600" /> {t('expense')}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{fmtSom(expenseUZS)}</p>
            {expenseUSD > 0 && <p className="text-sm text-muted-foreground tabular-nums">{fmtUSD(expenseUSD)} USD</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Minus size={16} className={netUZS >= 0 ? 'text-green-600' : 'text-red-600'} /> {t('net')}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className={`text-2xl font-semibold tabular-nums ${netUZS >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {netUZS >= 0 ? '+' : ''}{fmtSom(netUZS)}
            </p>
            {(incomeUSD > 0 || expenseUSD > 0) && (
              <p className={`text-sm tabular-nums ${netUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netUSD >= 0 ? '+' : ''}{fmtUSD(netUSD)} USD
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue category breakdown */}
      {incomeUZS > 0 && (
        <section className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('categoryBreakdown')}
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {catKeys.filter((k) => (catTotals[k] || 0) > 0).map((k) => {
              const amount = catTotals[k] || 0
              const pct = Math.round((amount / incomeUZS) * 100)
              const barPct = Math.round((amount / maxCatAmount) * 100)
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-xs text-muted-foreground truncate">
                    {t(`categories.${k}` as Parameters<typeof t>[0])}
                  </div>
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[k] ?? 'bg-primary'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs text-muted-foreground shrink-0">{pct}%</div>
                  <div className="w-36 text-right text-xs font-medium tabular-nums text-foreground shrink-0">
                    {fmtSom(amount)}
                  </div>
                </div>
              )
            })}
            {Object.values(catTotals).every((v) => v === 0) && (
              <p className="text-sm text-muted-foreground">{t('empty')}</p>
            )}
          </div>
        </section>
      )}

      {/* Monthly summary — last 12 months (tax report) */}
      {hasAnySummaryData && (
        <section className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileText size={14} className="text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('monthlySummary')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('monthlyTable.month')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('monthlyTable.income')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('monthlyTable.expense')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('monthlyTable.net')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthSummary.map((row) => (
                  <tr
                    key={row.month}
                    className={`hover:bg-muted/20 transition-colors ${row.month === selectedMonth ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      <a
                        href={`/finance?month=${row.month}`}
                        className="hover:text-primary transition-colors hover:underline"
                      >
                        {monthLabel(row.month)}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-green-700">
                      {row.income > 0 ? `+${fmtSom(row.income)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-red-600">
                      {row.expense > 0 ? `-${fmtSom(row.expense)}` : '—'}
                    </td>
                    <td className={`px-5 py-3 text-right tabular-nums font-semibold ${row.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {row.income === 0 && row.expense === 0 ? '—' : (row.net >= 0 ? '+' : '') + fmtSom(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Income table */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <TrendingUp size={14} /> {t('incomeSection', { n: filteredPayments.length })}
        </h2>
        <FinanceIncomeTable payments={filteredPayments} />
      </section>

      {/* Expense table */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <TrendingDown size={14} /> {t('expenseSection', { n: filteredPurchases.length })}
        </h2>
        <FinanceExpenseTable purchases={filteredPurchases} />
      </section>
    </div>
  )
}
