import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import {
  TrendingUp,
  LogIn,
  LogOut,
  AlertCircle,
  BedDouble,
  Users,
  Receipt,
  Wallet,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatCard from '@/components/admin/StatCard'
import RoomStatusGrid, { type RoomStatusRow } from '@/components/admin/RoomStatusGrid'
import RecentBookingsList, { type RecentBooking } from '@/components/admin/RecentBookingsList'
import CleaningStatusCards from '@/components/admin/CleaningStatusCards'
import TodayActionList, { type TodayRow } from '@/components/admin/TodayActionList'

// ─── Helpers ───────────────────────────────────────────────────────────────

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatUZS(n: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

// ─── RPC result types (get_dashboard_data — docs/migrations/025_dashboard_rpc.sql) ──

interface DashboardStats {
  newToday: number
  newYesterday: number
  scheduledTomorrow: number
  scheduledToday: number
  checkinToday: number
  checkinYesterday: number
  checkoutToday: number
  checkoutYesterday: number
}

interface CleaningRoomInfo {
  room_number: string
  floor: number
}

interface BookingRow {
  id: string
  reservation_code: string
  check_in: string
  adults: number
  guest_first: string | null
  guest_last: string | null
  room_number: string | null
}

interface PendingRow {
  id: string
  reservation_code: string
  check_in: string
  guest_first: string | null
  guest_last: string | null
}

interface PendingRegRow {
  id: string
  reservation_code: string
  guest_first: string | null
  guest_last: string | null
  room_number: string | null
}

interface UpcomingBill {
  id: string
  name: string
  dueDateStr: string
}

interface DashboardData {
  userName: string | null
  stats: DashboardStats
  rooms: RoomStatusRow[]
  cleaning: { dirty: CleaningRoomInfo[]; clean: CleaningRoomInfo[] }
  occupancy: { totalRooms: number; occupiedRooms: number; guestCount: number }
  recentBookings: BookingRow[]
  pendingReservations: PendingRow[]
  pendingRegistrations: PendingRegRow[]
  upcomingBills: UpcomingBill[]
  finance: { todayRevenue: number; monthRevenue: number; pendingPayments: number }
}

// Row shape for the arrivals / departures / no-show queries
interface StayQueryRow {
  id: string
  reservation_code: string
  adults: number
  total_amount: number
  breakfast_included: boolean | null
  expected_check_in_time: string | null
  rooms: { room_number: string } | null
  guests: { first_name: string | null; last_name: string | null } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ blocked?: string }>
}) {
  const auth = await getAuthClaims()
  if (!auth) redirect(`/${await getLocale()}/login`)

  const role = auth.role
  const isAdmin = role === 'admin'
  const frontDesk = isAdmin || role === 'receptionist'
  const money = isAdmin || role === 'accountant'
  const ops = isAdmin || role === 'receptionist' || role === 'housekeeper'

  const { locale } = await params
  const { blocked } = await searchParams
  const t = await getTranslations('dashboard')

  const todayStr = toDateStr(new Date())

  // All base dashboard data in one round-trip: get_dashboard_data (RLS applies)
  const supabase = await createClient()
  const stayFields =
    'id, reservation_code, adults, total_amount, breakfast_included, expected_check_in_time, rooms(room_number), guests(first_name, last_name)'
  const [rpcResult, arrivalsQ, departuresQ, noShowQ] = await Promise.all([
    supabase.rpc('get_dashboard_data', { p_today: todayStr }),
    // Today's action lists (front desk); cheap parallel queries, sin1 region
    frontDesk
      ? supabase
          .from('reservations')
          .select(stayFields)
          .in('status', ['pending', 'confirmed'])
          .eq('check_in', todayStr)
          .order('expected_check_in_time', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: null }),
    frontDesk
      ? supabase
          .from('reservations')
          .select(stayFields)
          .eq('status', 'checked_in')
          .lte('check_out', todayStr)
      : Promise.resolve({ data: null }),
    frontDesk
      ? supabase
          .from('reservations')
          .select(stayFields)
          .in('status', ['pending', 'confirmed'])
          .lt('check_in', todayStr)
      : Promise.resolve({ data: null }),
  ])
  if (rpcResult.error) throw new Error(`get_dashboard_data failed: ${rpcResult.error.message}`)
  const d = rpcResult.data as unknown as DashboardData

  const guestName = (first: string | null, last: string | null, fallback: string) =>
    first || last ? `${first ?? ''} ${last ?? ''}`.trim() : fallback

  const toTodayRow = (r: StayQueryRow): TodayRow => ({
    id: r.id,
    code: r.reservation_code,
    roomNumber: r.rooms?.room_number ?? null,
    guestName: guestName(r.guests?.first_name ?? null, r.guests?.last_name ?? null, t('guestFallback')),
    adults: r.adults,
    breakfast: r.breakfast_included ?? false,
    expectedTime: r.expected_check_in_time,
  })

  const arrivals = ((arrivalsQ.data ?? []) as unknown as StayQueryRow[]).map(toTodayRow)
  const noShowRows = ((noShowQ.data ?? []) as unknown as StayQueryRow[]).map(toTodayRow)
  const departureRows = (departuresQ.data ?? []) as unknown as StayQueryRow[]

  // Balance due per departure (completed payments only)
  let departures: TodayRow[] = []
  if (departureRows.length > 0) {
    const ids = departureRows.map((r) => r.id)
    const { data: pays } = await supabase
      .from('payments')
      .select('reservation_id, amount')
      .in('reservation_id', ids)
      .eq('status', 'completed')
    const paidBy = new Map<string, number>()
    for (const p of pays ?? []) {
      paidBy.set(p.reservation_id, (paidBy.get(p.reservation_id) ?? 0) + Number(p.amount))
    }
    departures = departureRows.map((r) => ({
      ...toTodayRow(r),
      balanceDue: Math.max(0, Number(r.total_amount) - (paidBy.get(r.id) ?? 0)),
    }))
  }

  const userName = d.userName || auth.fullName || auth.email || t('userFallback')
  const occupancy = {
    ...d.occupancy,
    availableRooms: d.occupancy.totalRooms - d.occupancy.occupiedRooms,
  }
  const dirtyCount = d.cleaning.dirty.length
  const recentBookings: RecentBooking[] = d.recentBookings.map((r) => ({
    id: r.id,
    reservation_code: r.reservation_code,
    guest_name: guestName(r.guest_first, r.guest_last, t('guestFallback')),
    check_in: r.check_in,
    adults: r.adults,
    room_number: r.room_number,
  }))
  const pendingReservations = frontDesk ? d.pendingReservations : []
  const pendingRegistrations = frontDesk ? d.pendingRegistrations : []
  const upcomingBills = money ? d.upcomingBills : []
  const financeSummary = money ? d.finance : null

  const todayLabel = new Date().toLocaleDateString(LOCALE_BCP47[locale] ?? 'ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ─── KPI chips (replace the old 11 stat cards for ops roles) ────────────────
  const chips = ops
    ? [
        ...(frontDesk
          ? [
              {
                key: 'arrivals',
                icon: <LogIn size={14} />,
                label: t('chipArrivals'),
                value: arrivals.length,
                href: `/reservations/list?checkIn=${todayStr}`,
              },
              {
                key: 'departures',
                icon: <LogOut size={14} />,
                label: t('chipDepartures'),
                value: departures.length,
                href: '/reservations/list?status=checked_in',
              },
            ]
          : []),
        {
          key: 'inhouse',
          icon: <Users size={14} />,
          label: t('chipInHouse'),
          value: occupancy.guestCount,
          href: frontDesk ? '/reservations/list?status=checked_in' : '/housekeeping',
        },
        {
          key: 'dirty',
          icon: <Sparkles size={14} />,
          label: t('chipDirty'),
          value: dirtyCount,
          href: '/housekeeping',
        },
      ]
    : []

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('greeting', { name: userName })}
        </h1>
        <p className="text-sm mt-0.5 capitalize text-muted-foreground">{todayLabel}</p>
      </div>

      {blocked === '1' && (
        <div className="rounded-lg p-4 flex items-center gap-3 bg-destructive/10">
          <AlertCircle size={18} className="text-destructive shrink-0" />
          <p className="text-sm text-destructive">{t('accessDenied')}</p>
        </div>
      )}

      {/* KPI chips — tappable, replace the old stat-card walls */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <span className="text-primary">{c.icon}</span>
              {c.label}
              <span className="tabular-nums rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {c.value}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Housekeeper first sees cleaning state */}
      {role === 'housekeeper' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('cleaningStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CleaningStatusCards dirtyRooms={d.cleaning.dirty} cleanRooms={d.cleaning.clean} />
          </CardContent>
        </Card>
      )}

      {/* TODAY action lists — the heart of the front-desk screen */}
      {frontDesk && (
        <>
          <TodayActionList mode="arrivals" rows={arrivals} />
          <TodayActionList mode="departures" rows={departures} />
          <TodayActionList mode="noshow" rows={noShowRows} />
        </>
      )}

      {/* Pending reservations — collapsed accordion */}
      {frontDesk && pendingReservations.length > 0 && (
        <details className="rounded-2xl bg-amber-500/10 open:pb-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-semibold text-foreground">
            <AlertCircle size={18} className="shrink-0 text-amber-700" />
            <span className="flex-1">{t('pendingReservations', { n: pendingReservations.length })}</span>
            <ChevronRight size={16} className="text-amber-700" />
          </summary>
          <div className="flex flex-wrap gap-2 px-4">
            {pendingReservations.slice(0, 5).map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <span className="font-mono">{r.reservation_code}</span>
                {(r.guest_first || r.guest_last) && (
                  <span className="text-muted-foreground">
                    · {r.guest_first} {r.guest_last}
                  </span>
                )}
              </Link>
            ))}
            {pendingReservations.length > 5 && (
              <Link
                href="/reservations/list?status=pending"
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-700"
              >
                {t('morePending', { n: pendingReservations.length - 5 })}
              </Link>
            )}
          </div>
        </details>
      )}

      {/* Half registrations — collapsed accordion */}
      {frontDesk && pendingRegistrations.length > 0 && (
        <details className="rounded-2xl bg-amber-500/10 open:pb-4">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-semibold text-foreground">
            <AlertCircle size={18} className="shrink-0 text-amber-700" />
            <span className="flex-1">{t('pendingRegistrations', { n: pendingRegistrations.length })}</span>
            <ChevronRight size={16} className="text-amber-700" />
          </summary>
          <div className="flex flex-wrap gap-2 px-4">
            {pendingRegistrations.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                {r.room_number && <span className="font-mono">#{r.room_number}</span>}
                {(r.guest_first || r.guest_last) && (
                  <span className="text-muted-foreground">
                    {r.guest_first} {r.guest_last}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </details>
      )}

      {/* Upcoming bills banner — money roles */}
      {money && upcomingBills.length > 0 && (
        <div className="rounded-2xl p-4 bg-blue-500/10">
          <div className="flex items-start gap-3">
            <Receipt size={18} className="text-blue-700 shrink-0 mt-px" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t('upcomingBills', { n: upcomingBills.length })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {upcomingBills.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    {b.name}
                    <span className="ml-1.5 text-muted-foreground">· {b.dueDateStr.slice(8)}</span>
                  </span>
                ))}
                <Link
                  href="/bills"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 hover:underline"
                >
                  {t('viewBills')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finance cards — accountant keeps them; admin gets a compact link strip */}
      {role === 'accountant' && financeSummary && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Wallet size={14} /> {t('financeSection')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={<Wallet size={16} />} label={t('todayRevenue')} value={formatUZS(financeSummary.todayRevenue)} />
            <StatCard icon={<TrendingUp size={16} />} label={t('monthRevenue')} value={formatUZS(financeSummary.monthRevenue)} />
            <StatCard icon={<Receipt size={16} />} label={t('pendingPaymentsCount')} value={String(financeSummary.pendingPayments)} href="/payments" />
          </div>
        </section>
      )}
      {isAdmin && (
        <Link
          href="/finance"
          className="flex items-center justify-between rounded-2xl bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <span className="inline-flex items-center gap-2">
            <Wallet size={16} className="text-primary" /> {t('financeLink')}
          </span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Link>
      )}

      {/* Rooms — the primary interactive object, full width */}
      {ops && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <BedDouble size={14} /> {t('operation')}
          </h2>
          <RoomStatusGrid rooms={d.rooms} role={role} />
          {role !== 'housekeeper' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('cleaningStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CleaningStatusCards dirtyRooms={d.cleaning.dirty} cleanRooms={d.cleaning.clean} />
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Recent reservations — collapsed to keep the screen short */}
      {frontDesk && recentBookings.length > 0 && (
        <details className="rounded-2xl bg-card open:pb-2" style={{ boxShadow: 'var(--shadow-card)' }}>
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="flex-1">{t('recentTitle')}</span>
            <ChevronRight size={16} />
          </summary>
          <div className="px-2">
            <RecentBookingsList bookings={recentBookings} />
          </div>
        </details>
      )}
    </div>
  )
}
