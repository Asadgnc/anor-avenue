import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
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

interface CleaningRoomInfo { room_number: string; floor: number }

async function fetchCleaningRooms(): Promise<{ dirty: CleaningRoomInfo[]; clean: CleaningRoomInfo[] }> {
  const supabase = await createClient()
  const [dirtyResult, cleanResult] = await Promise.all([
    supabase.from('rooms').select('room_number, floor').eq('cleaning_status', 'dirty').eq('is_active', true).order('floor').order('room_number'),
    supabase.from('rooms').select('room_number, floor').eq('cleaning_status', 'clean').eq('is_active', true).order('floor').order('room_number'),
  ])
  return {
    dirty: (dirtyResult.data ?? []) as CleaningRoomInfo[],
    clean: (cleanResult.data ?? []) as CleaningRoomInfo[],
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

interface UpcomingBill { id: string; name: string; dueDateStr: string }

async function fetchUpcomingBills(): Promise<UpcomingBill[]> {
  const supabase = await createClient()
  const { data: bills } = await supabase
    .from('recurring_bills')
    .select('id, name, due_day')
    .eq('is_active', true)

  if (!bills?.length) return []

  const today = new Date()
  const todayStr = toDateStr(today)
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  const in7DaysStr = toDateStr(in7Days)
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const upcoming = (bills as Array<{ id: string; name: string; due_day: number }>)
    .map((b) => {
      const day = Math.min(b.due_day, lastDay)
      const dueDateStr = `${monthStr}-${String(day).padStart(2, '0')}`
      return { ...b, dueDateStr }
    })
    .filter((b) => b.dueDateStr >= todayStr && b.dueDateStr <= in7DaysStr)

  if (!upcoming.length) return []

  const { data: paid } = await supabase
    .from('bill_payments')
    .select('bill_id')
    .in('bill_id', upcoming.map((b) => b.id))
    .gte('due_date', `${monthStr}-01`)
    .lte('due_date', `${monthStr}-${String(lastDay).padStart(2, '0')}`)
    .eq('status', 'paid')

  const paidIds = new Set((paid ?? []).map((p: { bill_id: string }) => p.bill_id))
  return upcoming.filter((b) => !paidIds.has(b.id))
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

  const [stats, roomStatusList, cleaningRooms, recentBookings, pendingReservations, userName, occupancy, upcomingBills] = await Promise.all([
    fetchStatCardsData(),
    fetchRoomStatusList(),
    fetchCleaningRooms(),
    fetchRecentBookings(t('guestFallback')),
    fetchPendingReservations(),
    fetchUserName(user.id, user.email ?? t('userFallback')),
    fetchRoomOccupancy(),
    fetchUpcomingBills().catch(() => [] as UpcomingBill[]),
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

      {/* Upcoming bills banner */}
      {upcomingBills.length > 0 && (
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
            <CardContent>
              <CleaningStatusCards
                dirtyRooms={cleaningRooms.dirty}
                cleanRooms={cleaningRooms.clean}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent reservations */}
      <RecentBookingsList bookings={recentBookings} />
    </div>
  )
}

