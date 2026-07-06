import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Coins, TrendingUp, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AccountingTabs from '@/components/admin/AccountingTabs'

function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

interface TaxRow {
  id: string
  tourist_tax_amount: number | null
  tourist_tax_paid: boolean | null
  registered_at: string | null
  guests: { first_name: string; last_name: string; nationality: string | null } | null
  reservations: { reservation_code: string } | null
}

export default async function TaxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Money page — admin + accountant only.
  const role = (user.user_metadata?.role as string | undefined) ?? ''
  if (!['admin', 'accountant'].includes(role)) redirect('/dashboard?blocked=1')

  const t = await getTranslations('tax')

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)

  const [regResult, settingsResult, incomeResult] = await Promise.all([
    supabase
      .from('guest_registrations')
      .select('id, tourist_tax_amount, tourist_tax_paid, registered_at, guests(first_name, last_name, nationality), reservations(reservation_code)')
      .not('tourist_tax_amount', 'is', null)
      .order('registered_at', { ascending: false }),
    supabase.from('hotel_settings').select('tourist_tax_per_night, usd_rate').eq('id', 1).single(),
    supabase.from('payments').select('amount, currency').eq('status', 'completed').gte('paid_at', monthStart).lt('paid_at', nextMonth),
  ])

  const rows = (regResult.data ?? []) as unknown as TaxRow[]
  const settings = settingsResult.data as { tourist_tax_per_night?: number; usd_rate?: number } | null
  const ratePerNight = Number(settings?.tourist_tax_per_night ?? 0)
  const rate = Number(settings?.usd_rate) || 12000

  const collected = rows.filter((r) => r.tourist_tax_paid).reduce((s, r) => s + Number(r.tourist_tax_amount ?? 0), 0)
  const pending = rows.filter((r) => !r.tourist_tax_paid).reduce((s, r) => s + Number(r.tourist_tax_amount ?? 0), 0)

  const incomeRows = (incomeResult.data ?? []) as Array<{ amount: number; currency: string }>
  const monthIncome = incomeRows.reduce((s, r) => s + (r.currency === 'USD' ? Number(r.amount) * rate : Number(r.amount)), 0)

  return (
    <div className="space-y-8">
      <AccountingTabs />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Coins size={16} className="text-green-600" /> {t('collected')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums text-foreground">{formatUZS(collected)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Coins size={16} className="text-amber-600" /> {t('pending')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums text-foreground">{formatUZS(pending)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarDays size={16} className="text-muted-foreground" /> {t('ratePerNight')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums text-foreground">{formatUZS(ratePerNight)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /> {t('incomeBase')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums text-foreground">{formatUZS(monthIncome)}</p></CardContent>
        </Card>
      </div>

      {/* Tourist tax records */}
      <section className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colGuest')}</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colNationality')}</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colReservation')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colAmount')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-foreground">
                      {r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.guests?.nationality ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{r.reservations?.reservation_code ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{formatUZS(Number(r.tourist_tax_amount ?? 0))}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.tourist_tax_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.tourist_tax_paid ? t('paid') : t('unpaid')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
