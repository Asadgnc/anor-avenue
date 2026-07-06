import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { BarChart3, Download } from 'lucide-react'
import SectionZone from '@/components/admin/SectionZone'
import AccountingTabs from '@/components/admin/AccountingTabs'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

async function fetchReportData(date: string) {
  const supabase = await createClient()

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const [
    checkinsResult,
    checkoutsResult,
    paymentsResult,
    occupancyResult,
    totalRoomsResult,
  ] = await Promise.all([
    supabase.from('reservations').select('id, reservation_code, room_rate, guests(first_name, last_name), rooms(room_number)').eq('check_in', date).in('status', ['checked_in', 'confirmed', 'checked_out']),
    supabase.from('reservations').select('id, reservation_code, total_amount, guests(first_name, last_name), rooms(room_number)').eq('check_out', date).in('status', ['checked_out', 'checked_in']),
    supabase.from('payments').select('amount, method, status, created_at').gte('created_at', dayStart).lte('created_at', dayEnd).eq('status', 'completed'),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'occupied').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const checkins = checkinsResult.data ?? []
  const checkouts = checkoutsResult.data ?? []
  const payments = paymentsResult.data ?? []
  const occupiedRooms = occupancyResult.count ?? 0
  const totalRooms = totalRoomsResult.count ?? 0
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
  const revenueByMethod: Record<string, number> = {}
  for (const p of payments) {
    revenueByMethod[p.method] = (revenueByMethod[p.method] ?? 0) + Number(p.amount)
  }

  return {
    checkins,
    checkouts,
    payments,
    totalRevenue,
    revenueByMethod,
    occupancyRate,
    occupiedRooms,
    totalRooms,
  }
}

interface CheckinRow {
  id: string
  reservation_code: string
  room_rate: number
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string } | null
}

interface CheckoutRow {
  id: string
  reservation_code: string
  total_amount: number
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string } | null
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Money/reports page — admin + accountant only.
  const role = (user.user_metadata?.role as string | undefined) ?? ''
  if (!['admin', 'accountant'].includes(role)) redirect('/dashboard?blocked=1')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('reports')
  const tMethods = await getTranslations('payments.methods')

  const methodLabel = (method: string): string => {
    if (method === 'payme') return 'Payme'
    if (method === 'click') return 'Click'
    if (method === 'uzum') return 'Uzum'
    if (method === 'cash') return tMethods('cash')
    if (method === 'transfer') return tMethods('transfer')
    return method
  }

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = params.date ?? today

  const data = await fetchReportData(date).catch(() => null)
  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
        <p className="text-destructive">{t('errorMessage')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <AccountingTabs />
      {/* Header + date picker */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(date + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <form method="get" className="flex gap-2 items-center">
            <input
              name="date"
              type="date"
              defaultValue={date}
              max={today}
              className="px-3 py-2 rounded-lg text-sm text-foreground bg-card ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-opacity hover:opacity-90 duration-150"
            >
              {t('viewButton')}
            </button>
          </form>
          <a
            href={`/api/reports/export?date=${date}&locale=${locale}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 bg-card ring-1 ring-foreground/10 text-foreground transition-shadow hover:ring-foreground/20 duration-150"
          >
            <Download size={14} /> {t('exportButton')}
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <SectionZone tone="purple" title={t('summaryTitle')} icon={<BarChart3 size={16} />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label={t('occupancy')} value={`${data.occupancyRate.toFixed(0)}%`} sub={t('roomsCount', { occupied: data.occupiedRooms, total: data.totalRooms })} accent="text-primary" />
          <SummaryCard label={t('dailyIncome')} value={formatUZS(data.totalRevenue)} sub={t('transactions', { n: data.payments.length })} accent="text-success" />
          <SummaryCard label="Check-in" value={String(data.checkins.length)} sub={t('checkIns')} accent="text-info" />
          <SummaryCard label="Check-out" value={String(data.checkouts.length)} sub={t('checkOuts')} accent="text-warning" />
        </div>
      </SectionZone>

      {/* Revenue breakdown by method */}
      {Object.keys(data.revenueByMethod).length > 0 && (
        <Section title={t('revenueBreakdown')}>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.revenueByMethod).map(([method, amount]) => (
              <div
                key={method}
                className="flex flex-col gap-1 px-4 py-3 rounded-lg min-w-[120px] bg-muted border border-border"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {methodLabel(method)}
                </span>
                <span className="font-bold tabular-nums text-primary">
                  {formatUZS(amount)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Today's check-ins */}
      <Section title={t('checkInList', { n: data.checkins.length })}>
        {data.checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noCheckIns')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[t('headers.reservation'), t('headers.guest'), t('headers.room'), t('headers.roomPrice')].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.checkins as unknown as CheckinRow[]).map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/50 transition-colors duration-150">
                  <td className="py-2.5 px-3">
                    <Link href={`/reservations/${r.id}`} className="font-mono text-xs text-primary hover:underline">
                      {r.reservation_code}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-foreground">{r.guests?.first_name} {r.guests?.last_name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.rooms?.room_number ?? '—'}</td>
                  <td className="py-2.5 px-3 tabular-nums text-muted-foreground">{formatUZS(r.room_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Today's check-outs */}
      <Section title={t('checkOutList', { n: data.checkouts.length })}>
        {data.checkouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noCheckOuts')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[t('headers.reservation'), t('headers.guest'), t('headers.room'), t('headers.total')].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.checkouts as unknown as CheckoutRow[]).map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/50 transition-colors duration-150">
                  <td className="py-2.5 px-3">
                    <Link href={`/reservations/${r.id}`} className="font-mono text-xs text-primary hover:underline">
                      {r.reservation_code}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-foreground">{r.guests?.first_name} {r.guests?.last_name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.rooms?.room_number ?? '—'}</td>
                  <td className="py-2.5 px-3 font-semibold tabular-nums text-primary">{formatUZS(r.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl p-4 bg-card ring-1 ring-foreground/10">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-none ${accent}`}>{value}</p>
      <p className="text-xs mt-1.5 text-muted-foreground">{sub}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden bg-card ring-1 ring-foreground/10">
      <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
        {title}
      </p>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
