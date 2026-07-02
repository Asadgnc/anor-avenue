import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatCard from '@/components/admin/StatCard'
import RoomStatusGrid, { type RoomStatusRow } from '@/components/admin/RoomStatusGrid'
import RevenueAreaChart from '@/components/admin/RevenueAreaChart'
import RecentBookingsList, { type RecentBooking } from '@/components/admin/RecentBookingsList'
import MonthSummaryCard from '@/components/admin/MonthSummaryCard'

// ─── Sabitler ───────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function delta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / prev) * 100
}

// ─── Veri çekme ───────────────────────────────────────────────────────────────

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
  const [cleanResult, dirtyResult, inProgressResult, inspectedResult] = await Promise.all([
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'clean').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'dirty').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'in_progress').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'inspected').eq('is_active', true),
  ])
  return {
    clean: cleanResult.count ?? 0,
    dirty: dirtyResult.count ?? 0,
    in_progress: inProgressResult.count ?? 0,
    inspected: inspectedResult.count ?? 0,
  }
}

async function fetchRevenueTrend() {
  const supabase = await createClient()
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 29)
  const startStr = toDateStr(start)

  const { data } = await supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('status', 'completed')
    .gte('paid_at', startStr)

  const rows = (data ?? []) as Array<{ amount: number; paid_at: string }>
  const byDay = new Map<string, number>()
  for (const r of rows) {
    const day = r.paid_at.split('T')[0]
    byDay.set(day, (byDay.get(day) ?? 0) + Number(r.amount))
  }

  const days = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = toDateStr(d)
    days.push({ date: dateStr, amount: byDay.get(dateStr) ?? 0 })
  }
  return days
}

async function fetchRecentBookings(): Promise<RecentBooking[]> {
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
    guest_name: r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : 'Misafir',
    check_in: r.check_in,
    adults: r.adults,
    room_number: r.rooms?.room_number ?? null,
  }))
}

async function fetchMonthSummary() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const todayStr = toDateStr(now)

  const [resResult, payResult, totalRoomsResult] = await Promise.all([
    supabase.from('reservations').select('status, nights').gte('check_in', monthStart).lte('check_in', todayStr),
    supabase.from('payments').select('status').gte('created_at', monthStart),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const reservations = (resResult.data ?? []) as Array<{ status: string; nights: number }>
  const nonCancelled = reservations.filter((r) => r.status !== 'cancelled')
  const cancellationRate = reservations.length > 0 ? (reservations.filter((r) => r.status === 'cancelled').length / reservations.length) * 100 : 0
  const avgNights = nonCancelled.length > 0 ? nonCancelled.reduce((s, r) => s + Number(r.nights), 0) / nonCancelled.length : 0

  const payments = (payResult.data ?? []) as Array<{ status: string }>
  const collectionRate = payments.length > 0 ? (payments.filter((p) => p.status === 'completed').length / payments.length) * 100 : 0

  const totalRooms = Math.max(totalRoomsResult.count ?? 1, 1)
  const daysElapsed = now.getDate()
  const roomNightsThisMonth = nonCancelled.reduce((s, r) => s + Number(r.nights), 0)
  const occupancyRate = Math.min(100, (roomNightsThisMonth / (totalRooms * daysElapsed)) * 100)

  const monthLabel = now.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })

  return { occupancyRate, collectionRate, cancellationRate, avgNights, monthLabel }
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

// ─── Sayfa ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { blocked } = await searchParams

  const [stats, roomStatusList, cleaning, revenueTrend, recentBookings, pendingReservations, userName] = await Promise.all([
    fetchStatCardsData(),
    fetchRoomStatusList(),
    fetchCleaningStatus(),
    fetchRevenueTrend(),
    fetchRecentBookings(),
    fetchPendingReservations(),
    fetchUserName(user.id, user.email ?? 'Kullanıcı'),
  ])
  const monthSummary = await fetchMonthSummary()

  const todayLabel = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Hoş geldin, {userName}
        </h1>
        <p className="text-sm mt-0.5 capitalize text-muted-foreground">{todayLabel}</p>
      </div>

      {blocked === '1' && (
        <div className="rounded-lg p-4 flex items-center gap-3 bg-destructive/10">
          <AlertCircle size={18} className="text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            Bu sayfaya erişim yetkiniz yok. Rolünüze uygun sayfaları sol menüden seçebilirsiniz.
          </p>
        </div>
      )}

      {pendingReservations.length > 0 && (
        <div className="rounded-lg p-4 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-px" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {pendingReservations.length} onay bekleyen rezervasyon var
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
                    +{pendingReservations.length - 5} daha →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genel Bakış */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <LayoutGrid size={14} /> Genel Bakış
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<CalendarPlus size={16} />}
            label="Yeni Rezervasyon (bugün)"
            value={String(stats.newToday)}
            deltaPercent={delta(stats.newToday, stats.newYesterday)}
            href={`/reservations/list?createdOn=${stats.todayStr}`}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Yarın Planlanan Giriş"
            value={String(stats.scheduledTomorrow)}
            deltaPercent={delta(stats.scheduledTomorrow, stats.scheduledToday)}
            href={`/reservations/list?checkIn=${stats.tomorrowStr}`}
          />
          <StatCard
            icon={<LogIn size={16} />}
            label="Bugün Check-in"
            value={String(stats.checkinToday)}
            deltaPercent={delta(stats.checkinToday, stats.checkinYesterday)}
            href={`/reservations/list?checkIn=${stats.todayStr}&status=checked_in`}
          />
          <StatCard
            icon={<LogOut size={16} />}
            label="Bugün Check-out"
            value={String(stats.checkoutToday)}
            deltaPercent={delta(stats.checkoutToday, stats.checkoutYesterday)}
            href={`/reservations/list?checkOut=${stats.todayStr}&status=checked_out`}
          />
        </div>
      </section>

      {/* Operasyon */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <BedDouble size={14} /> Operasyon
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoomStatusGrid rooms={roomStatusList} />
          <Card>
            <CardHeader>
              <CardTitle>Oda Temizlik Durumu</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: 'Temiz', count: cleaning.clean, color: 'text-green-600', icon: <CheckCircle2 size={16} /> },
                { label: 'Kirli', count: cleaning.dirty, color: 'text-red-600', icon: <Wind size={16} /> },
                { label: 'Temizleniyor', count: cleaning.in_progress, color: 'text-amber-600', icon: <Clock size={16} /> },
                { label: 'Denetlendi', count: cleaning.inspected, color: 'text-primary', icon: <Sparkles size={16} /> },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-border p-3 flex items-center gap-2.5">
                  <span className={c.color}>{c.icon}</span>
                  <div>
                    <p className="text-lg font-semibold leading-none text-foreground">{c.count}</p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">{c.label}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Finans */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Wallet size={14} /> Finans
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Link href="/reports" className="block transition-opacity hover:opacity-80">
            <RevenueAreaChart data={revenueTrend} />
          </Link>
          <MonthSummaryCard
            occupancyRate={monthSummary.occupancyRate}
            collectionRate={monthSummary.collectionRate}
            cancellationRate={monthSummary.cancellationRate}
            avgNights={monthSummary.avgNights}
            monthLabel={monthSummary.monthLabel}
          />
        </div>
      </section>

      {/* Son rezervasyonlar */}
      <RecentBookingsList bookings={recentBookings} />
    </div>
  )
}
