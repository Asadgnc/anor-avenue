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
  CalendarPlus,
  AlertCircle,
  LayoutGrid,
  BedDouble,
  Users,
  DoorOpen,
  DoorClosed,
  Receipt,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatCard from '@/components/admin/StatCard'
import RoomStatusGrid, { type RoomStatusRow } from '@/components/admin/RoomStatusGrid'
import RecentBookingsList, { type RecentBooking } from '@/components/admin/RecentBookingsList'
import CleaningStatusCards from '@/components/admin/CleaningStatusCards'

// ─── Helpers ───────────────────────────────────────────────────────────────

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function delta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / prev) * 100
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
  const tomorrowStr = toDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000))

  // Tüm dashboard verisi tek round-trip: get_dashboard_data (RLS geçerli)
  const supabase = await createClient()
  const { data: rpcData, error } = await supabase.rpc('get_dashboard_data', { p_today: todayStr })
  if (error) throw new Error(`get_dashboard_data failed: ${error.message}`)
  const d = rpcData as unknown as DashboardData

  const guestName = (first: string | null, last: string | null, fallback: string) =>
    first || last ? `${first ?? ''} ${last ?? ''}`.trim() : fallback

  const userName = d.userName || auth.fullName || auth.email || t('userFallback')
  const stats = d.stats
  const occupancy = {
    ...d.occupancy,
    availableRooms: d.occupancy.totalRooms - d.occupancy.occupiedRooms,
  }
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

  return (
    <div className="space-y-6">
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

      {frontDesk && pendingReservations.length > 0 && (
        <div className="rounded-lg p-4 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-px" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t('pendingReservations', { n: pendingReservations.length })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingReservations.slice(0, 5).map((r) => (
                  <Link
                    key={r.id}
                    href={`/reservations/${r.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card ring-1 ring-foreground/10 hover:opacity-80 text-foreground"
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
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400"
                  >
                    {t('morePending', { n: pendingReservations.length - 5 })}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yarı kayıt (registration_pending) banner — tam kaydı bekleyen girişler */}
      {frontDesk && pendingRegistrations.length > 0 && (
        <div className="rounded-lg p-4 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-px" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t('pendingRegistrations', { n: pendingRegistrations.length })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingRegistrations.map((r) => (
                  <Link
                    key={r.id}
                    href={`/reservations/${r.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card ring-1 ring-foreground/10 hover:opacity-80 text-foreground"
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
            </div>
          </div>
        </div>
      )}

      {/* Upcoming bills banner */}
      {money && upcomingBills.length > 0 && (
        <div className="rounded-lg p-4 bg-blue-500/10">
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
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-card ring-1 ring-foreground/10 text-foreground"
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

      {/* Finance summary — money roles only (admin + accountant) */}
      {money && financeSummary && (
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

      {/* Overview — room & guest counts (non-clickable, no badges) */}
      {ops && (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <LayoutGrid size={14} /> {t('overview')}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<BedDouble size={16} />}
            label={t('totalRooms')}
            value={String(occupancy.totalRooms)}
          />
          <StatCard
            icon={<DoorClosed size={16} />}
            label={t('occupiedRooms')}
            value={String(occupancy.occupiedRooms)}
          />
          <StatCard
            icon={<DoorOpen size={16} />}
            label={t('availableRooms')}
            value={String(occupancy.availableRooms)}
          />
          <StatCard
            icon={<Users size={16} />}
            label={t('guestsStaying')}
            value={String(occupancy.guestCount)}
          />
        </div>
      </section>
      )}

      {/* Today's movement — front desk only */}
      {frontDesk && (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <CalendarPlus size={14} /> {t('todayMovement')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<CalendarPlus size={16} />}
            label={t('newReservations')}
            value={String(stats.newToday)}
            deltaPercent={delta(stats.newToday, stats.newYesterday)}
            href={`/reservations/list?createdOn=${todayStr}`}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label={t('tomorrowCheckIn')}
            value={String(stats.scheduledTomorrow)}
            deltaPercent={delta(stats.scheduledTomorrow, stats.scheduledToday)}
            href={`/reservations/list?checkIn=${tomorrowStr}`}
          />
          <StatCard
            icon={<LogIn size={16} />}
            label={t('todayCheckIn')}
            value={String(stats.checkinToday)}
            deltaPercent={delta(stats.checkinToday, stats.checkinYesterday)}
            href={`/reservations/list?checkIn=${todayStr}&status=checked_in`}
          />
          <StatCard
            icon={<LogOut size={16} />}
            label={t('todayCheckOut')}
            value={String(stats.checkoutToday)}
            deltaPercent={delta(stats.checkoutToday, stats.checkoutYesterday)}
            href={`/reservations/list?checkOut=${todayStr}&status=checked_out`}
          />
        </div>
      </section>
      )}

      {/* Operation — room status + cleaning (operational roles) */}
      {ops && (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <BedDouble size={14} /> {t('operation')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoomStatusGrid rooms={d.rooms} role={role} />
          <Card>
            <CardHeader>
              <CardTitle>{t('cleaningStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CleaningStatusCards
                dirtyRooms={d.cleaning.dirty}
                cleanRooms={d.cleaning.clean}
              />
            </CardContent>
          </Card>
        </div>
      </section>
      )}

      {/* Recent reservations — front desk only */}
      {frontDesk && <RecentBookingsList bookings={recentBookings} />}
    </div>
  )
}
