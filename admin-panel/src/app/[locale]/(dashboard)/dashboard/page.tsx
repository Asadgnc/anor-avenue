import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  TrendingUp,
  LogIn,
  LogOut,
  CalendarPlus,
  AlertCircle,
  CheckCircle2,
  Wind,
  Clock,
  Sparkles,
  LayoutGrid,
  BedDouble,
  Users,
  DoorOpen,
  DoorClosed,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatCard from '@/components/admin/StatCard'
import RoomStatusGrid, { type RoomStatusRow } from '@/components/admin/RoomStatusGrid'
import RecentBookingsList, { type RecentBooking } from '@/components/admin/RecentBookingsList'

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

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchUserName(userId: string, fallback: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  return data?.full_name || fallback
}

async function fetchStatCardsData() {
  const supabase = await createClient()
  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = toDateStr(tomorrow)

  const [
    newTodayResult,
    newYesterdayResult,
    scheduledTomorrowResult,
    scheduledTodayResult,
    checkinTodayResult,
    checkinYesterdayResult,
    checkoutTodayResult,
    checkoutYesterdayResult,
  ] = await Promise.all([
    supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', todayStr).lt('created_at', tomorrowStr),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', yesterdayStr).lt('created_at', todayStr),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', tomorrowStr).not('status', 'in', '(cancelled,no_show)'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', todayStr).not('status', 'in', '(cancelled,no_show)'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', todayStr).eq('status', 'checked_in'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', yesterdayStr).in('status', ['checked_in', 'checked_out']),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_out', todayStr).eq('status', 'checked_out'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_out', yesterdayStr).eq('status', 'checked_out'),
  ])

  return {
    todayStr,
    tomorrowStr,
    newToday: newTodayResult.count ?? 0,
    newYesterday: newYesterdayResult.count ?? 0,
    scheduledTomorrow: scheduledTomorrowResult.count ?? 0,
    scheduledToday: scheduledTodayResult.count ?? 0,
    checkinToday: checkinTodayResult.count ?? 0,
    checkinYesterday: checkinYesterdayResult.count ?? 0,
    checkoutToday: checkoutTodayResult.count ?? 0,
    checkoutYesterday: checkoutYesterdayResult.count ?? 0,
  }
}

async function fetchRoomStatusList(): Promise<RoomStatusRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rooms')
    .select('room_number, floor, status')
    .eq('is_active', true)
    .order('floor')
    .order('room_number')
  return (data ?? []) as RoomStatusRow[]
}

async function fetchCleaningStatus() {
  const supabase = await createClient()
  const [cleanResult, dirtyResult, inProgressResult, cleanedResult, inspectedResult] = await Promise.all([
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'clean').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'dirty').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'in_progress').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'cleaned').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'inspected').eq('is_active', true),
  ])
  return {
    clean: cleanResult.count ?? 0,
    dirty: dirtyResult.count ?? 0,
    in_progress: inProgressResult.count ?? 0,
    cleaned: cleanedResult.count ?? 0,
    inspected: inspectedResult.count ?? 0,
  }
}

async function fetchRoomOccupancy() {
  const supabase = await createClient()
  const todayStr = toDateStr(new Date())
  const [totalResult, checkedInResult] = await Promise.all([
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('reservations')
      .select('adults, children')
      .eq('status', 'checked_in')
      .lte('check_in', todayStr)
      .gt('check_out', todayStr),
  ])
  const totalRooms = totalResult.count ?? 0
  const activeRes = (checkedInResult.data ?? []) as Array<{ adults: number; children: number }>
  const occupiedRooms = activeRes.length
  const guestCount = activeRes.reduce((sum, r) => sum + Number(r.adults) + Number(r.children), 0)
  return { totalRooms, occupiedRooms, availableRooms: totalRooms - occupiedRooms, guestCount }
}

async function fetchRecentBookings(guestFallback: string): Promise<RecentBooking[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservations')
    .select('id, reservation_code, check_in, adults, guests(first_name, last_name), rooms(room_number)')
    .order('created_at', { ascending: false })
    .limit(5)

  type Row = {
    id: string
    reservation_code: string
    check_in: string
    adults: number
    guests: { first_name: string; last_name: string } | null
    rooms: { room_number: string } | null
  }

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    reservation_code: r.reservation_code,
    guest_name: r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : guestFallback,
    check_in: r.check_in,
    adults: r.adults,
    room_number: r.rooms?.room_number ?? null,
  }))
}

interface PendingRow {
  id: string
  reservation_code: string
  check_in: string
  guests: { first_name: string; last_name: string } | null
}

async function fetchPendingReservations(): Promise<PendingRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservations')
    .select('id, reservation_code, check_in, guests(first_name, last_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as unknown as PendingRow[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ blocked?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { locale } = await params
  const { blocked } = await searchParams
  const t = await getTranslations('dashboard')

  const [stats, roomStatusList, cleaning, recentBookings, pendingReservations, userName, occupancy] = await Promise.all([
    fetchStatCardsData(),
    fetchRoomStatusList(),
    fetchCleaningStatus(),
    fetchRecentBookings(t('guestFallback')),
    fetchPendingReservations(),
    fetchUserName(user.id, user.email ?? t('userFallback')),
    fetchRoomOccupancy(),
  ])

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

      {pendingReservations.length > 0 && (
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
                    {r.guests && (
                      <span className="text-muted-foreground">
                        · {r.guests.first_name} {r.guests.last_name}
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

      {/* Overview — room & guest counts (non-clickable, no badges) */}
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

      {/* Today's movement */}
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
            href={`/reservations/list?createdOn=${stats.todayStr}`}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label={t('tomorrowCheckIn')}
            value={String(stats.scheduledTomorrow)}
            deltaPercent={delta(stats.scheduledTomorrow, stats.scheduledToday)}
            href={`/reservations/list?checkIn=${stats.tomorrowStr}`}
          />
          <StatCard
            icon={<LogIn size={16} />}
            label={t('todayCheckIn')}
            value={String(stats.checkinToday)}
            deltaPercent={delta(stats.checkinToday, stats.checkinYesterday)}
            href={`/reservations/list?checkIn=${stats.todayStr}&status=checked_in`}
          />
          <StatCard
            icon={<LogOut size={16} />}
            label={t('todayCheckOut')}
            value={String(stats.checkoutToday)}
            deltaPercent={delta(stats.checkoutToday, stats.checkoutYesterday)}
            href={`/reservations/list?checkOut=${stats.todayStr}&status=checked_out`}
          />
        </div>
      </section>

      {/* Operation */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <BedDouble size={14} /> {t('operation')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoomStatusGrid rooms={roomStatusList} />
          <Card>
            <CardHeader>
              <CardTitle>{t('cleaningStatus')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <CleaningLegend cleaning={cleaning} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent reservations */}
      <RecentBookingsList bookings={recentBookings} />
    </div>
  )
}

async function CleaningLegend({
  cleaning,
}: {
  cleaning: { clean: number; dirty: number; in_progress: number; cleaned: number; inspected: number }
}) {
  const ts = await getTranslations('status.cleaning')
  const items = [
    { label: ts('clean'), count: cleaning.clean, color: 'text-green-600', icon: <CheckCircle2 size={16} /> },
    { label: ts('dirty'), count: cleaning.dirty, color: 'text-red-600', icon: <Wind size={16} /> },
    { label: ts('in_progress'), count: cleaning.in_progress, color: 'text-amber-600', icon: <Clock size={16} /> },
    { label: ts('cleaned'), count: cleaning.cleaned, color: 'text-sky-600', icon: <Sparkles size={16} /> },
    { label: ts('inspected'), count: cleaning.inspected, color: 'text-primary', icon: <CheckCircle2 size={16} /> },
  ]
  return (
    <>
      {items.map((c) => (
        <div key={c.label} className="rounded-lg border border-border p-3 flex items-center gap-2.5">
          <span className={c.color}>{c.icon}</span>
          <div>
            <p className="text-lg font-semibold leading-none text-foreground">{c.count}</p>
            <p className="text-[11px] mt-0.5 text-muted-foreground">{c.label}</p>
          </div>
        </div>
      ))}
    </>
  )
}
