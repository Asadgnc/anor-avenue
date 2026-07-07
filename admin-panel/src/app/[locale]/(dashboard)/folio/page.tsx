import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { Coins, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AccountingTabs from '@/components/admin/AccountingTabs'

function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

interface FolioRow {
  id: string
  reservation_code: string
  total_amount: number | null
  currency: string
  status: string
  check_in: string
  check_out: string
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string } | null
  payments: Array<{ amount: number; status: string }> | null
}

export default async function FolioPage() {
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  // Money page — admin + accountant only.
  const role = auth.role
  if (!['admin', 'accountant'].includes(role)) redirect('/dashboard?blocked=1')

  const t = await getTranslations('folio')
  const tStatus = await getTranslations('status')

  const { data } = await supabase
    .from('reservations')
    .select('id, reservation_code, total_amount, currency, status, check_in, check_out, guests(first_name, last_name), rooms(room_number), payments(amount, status)')
    .not('status', 'in', '(cancelled,no_show)')
    .order('check_in', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as unknown as FolioRow[]

  const withBalance = rows.map((r) => {
    const charges = Number(r.total_amount ?? 0)
    const paid = (r.payments ?? [])
      .filter((p) => p.status === 'completed')
      .reduce((s, p) => s + Number(p.amount), 0)
    return { ...r, charges, paid, balance: charges - paid }
  })

  const totalCharges = withBalance.reduce((s, r) => s + r.charges, 0)
  const totalPaid = withBalance.reduce((s, r) => s + r.paid, 0)
  const outstanding = totalCharges - totalPaid

  const statusLabel = (s: string): string => {
    try { return tStatus(s as Parameters<typeof tStatus>[0]) } catch { return s }
  }

  return (
    <div className="space-y-8">
      <AccountingTabs />

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /> {t('totalCharges')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums text-foreground">{formatUZS(totalCharges)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Coins size={16} className="text-green-600" /> {t('totalPaid')}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold tabular-nums text-foreground">{formatUZS(totalPaid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet size={16} className={outstanding > 0 ? 'text-amber-600' : 'text-green-600'} /> {t('outstanding')}</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-semibold tabular-nums ${outstanding > 0 ? 'text-amber-700' : 'text-foreground'}`}>{formatUZS(outstanding)}</p></CardContent>
        </Card>
      </div>

      {/* Folio list */}
      <section className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {withBalance.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colGuest')}</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colRoom')}</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colDates')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colCharges')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colPaid')}</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('colBalance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {withBalance.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/reservations/${r.id}`} className="text-foreground hover:text-primary hover:underline">
                        {r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : r.reservation_code}
                      </Link>
                      <span className="ml-2 text-[11px] text-muted-foreground">{statusLabel(r.status)}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.rooms?.room_number ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground tabular-nums">{r.check_in} → {r.check_out}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">{formatUZS(r.charges)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-green-700">{formatUZS(r.paid)}</td>
                    <td className={`px-5 py-3 text-right tabular-nums font-semibold ${r.balance > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                      {formatUZS(r.balance)}
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
