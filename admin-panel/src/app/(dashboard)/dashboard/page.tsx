import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BedDouble,
  TrendingUp,
  BarChart3,
  LogIn,
  LogOut,
  CreditCard,
  Sparkles,
  Wind,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import MetricCharts from '@/components/admin/MetricCharts'

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface ArrivalRow {
  id: string
  reservation_code: string
  status: string
  check_in: string
  adults: number
  room_rate: number
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string; room_types: { name: string } | null } | null
}

interface DepartureRow {
  id: string
  reservation_code: string
  check_out: string
  total_amount: number
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string } | null
}

interface PendingRow {
  id: string
  reservation_code: string
  check_in: string
  created_at: string
  guests: { first_name: string; last_name: string } | null
}

// ─── Veri çekme ───────────────────────────────────────────────────────────────

async function fetch30DayMetrics() {
  const supabase = await createClient()
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)

  const startDate = thirtyDaysAgo.toISOString().split('T')[0]
  const endDate = today.toISOString().split('T')[0]

  const [reservationsResult, totalRoomsResult] = await Promise.all([
    supabase
      .from('reservations')
      .select('check_in, check_out, room_rate')
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .lte('check_in', endDate)
      .gte('check_out', startDate),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const reservations = (reservationsResult.data ?? []) as Array<{ check_in: string; check_out: string; room_rate: number }>
  const totalRooms = Math.max(totalRoomsResult.count ?? 1, 1)

  const days = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(thirtyDaysAgo.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    const dayRes = reservations.filter((r) => r.check_in <= dateStr && r.check_out > dateStr)
    const rates = dayRes.map((r) => Number(r.room_rate))
    const adr = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
    const occupancy = (dayRes.length / totalRooms) * 100
    const revpar = (adr * occupancy) / 100

    days.push({ date: dateStr, occupancy, adr, revpar })
  }

  return days
}

async function fetchDashboardData() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    totalRoomsResult,
    occupiedRoomsResult,
    adrResult,
    checkinsResult,
    checkoutsResult,
    pendingPaymentsResult,
    cleanResult,
    dirtyResult,
    inProgressResult,
    inspectedResult,
    arrivalsResult,
    departuresResult,
    pendingReservationsResult,
  ] = await Promise.all([
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'occupied').eq('is_active', true),
    supabase.from('reservations').select('room_rate').eq('check_in', today).in('status', ['checked_in', 'confirmed']),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', today).in('status', ['confirmed', 'pending']),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('check_out', today).eq('status', 'checked_in'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'clean').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'dirty').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'in_progress').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('cleaning_status', 'inspected').eq('is_active', true),
    // Bugünkü check-in listesi
    supabase
      .from('reservations')
      .select('id, reservation_code, status, check_in, adults, room_rate, guests(first_name, last_name), rooms(room_number, room_types(name))')
      .eq('check_in', today)
      .in('status', ['confirmed', 'pending', 'checked_in'])
      .order('created_at'),
    // Bugünkü check-out listesi
    supabase
      .from('reservations')
      .select('id, reservation_code, check_out, total_amount, guests(first_name, last_name), rooms(room_number)')
      .eq('check_out', today)
      .eq('status', 'checked_in')
      .order('created_at'),
    // Onay bekleyen rezervasyonlar (pending — misafir sitesinden gelenler)
    supabase
      .from('reservations')
      .select('id, reservation_code, check_in, created_at, guests(first_name, last_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalRooms = totalRoomsResult.count ?? 0
  const occupiedRooms = occupiedRoomsResult.count ?? 0
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

  const rates = adrResult.data?.map((r) => Number(r.room_rate)) ?? []
  const adr = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
  const revpar = (adr * occupancyRate) / 100

  return {
    totalRooms,
    occupiedRooms,
    occupancyRate,
    adr,
    revpar,
    checkins: checkinsResult.count ?? 0,
    checkouts: checkoutsResult.count ?? 0,
    pendingPayments: pendingPaymentsResult.count ?? 0,
    cleaning: {
      clean: cleanResult.count ?? 0,
      dirty: dirtyResult.count ?? 0,
      in_progress: inProgressResult.count ?? 0,
      inspected: inspectedResult.count ?? 0,
    },
    arrivals: (arrivalsResult.data ?? []) as unknown as ArrivalRow[],
    departures: (departuresResult.data ?? []) as unknown as DepartureRow[],
    pendingReservations: (pendingReservationsResult.data ?? []) as unknown as PendingRow[],
  }
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function formatUZS(amount: number): string {
  if (amount === 0) return '—'
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) + ' UZS'
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%'
}

// ─── Alt bileşenler ────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  description: string
  accent?: boolean
}

function MetricCard({ icon, label, value, description, accent = false }: MetricCardProps) {
  return (
    <div
      style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      className="rounded-xl border p-5 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--color-admin-muted)' }} className="w-4 h-4">
          {icon}
        </span>
        <span style={{ color: 'var(--color-admin-muted)' }} className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        style={{ color: accent ? 'var(--color-accent)' : '#E8E8F0' }}
        className="text-3xl font-bold tabular-nums leading-none"
      >
        {value}
      </p>
      <p style={{ color: 'var(--color-admin-muted)' }} className="text-xs">
        {description}
      </p>
    </div>
  )
}

interface CleaningBadgeProps {
  label: string
  count: number
  color: string
  icon: React.ReactNode
}

function CleaningBadge({ label, count, color, icon }: CleaningBadgeProps) {
  return (
    <div
      style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      className="flex items-center gap-3 rounded-lg border px-4 py-3"
    >
      <span style={{ color }} className="w-4 h-4 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p style={{ color: 'var(--color-admin-muted)' }} className="text-xs">
          {label}
        </p>
      </div>
      <span style={{ color }} className="text-xl font-bold tabular-nums">
        {count}
      </span>
    </div>
  )
}

// ─── Sayfa ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [data, chartData] = await Promise.all([
    fetchDashboardData().catch((err: unknown) => {
      console.error('[Dashboard] fetchDashboardData hatası:', err)
      return null
    }),
    fetch30DayMetrics().catch((): Array<{ date: string; occupancy: number; adr: number; revpar: number }> => []),
  ])

  const metrics = data ?? {
    totalRooms: 0,
    occupiedRooms: 0,
    occupancyRate: 0,
    adr: 0,
    revpar: 0,
    checkins: 0,
    checkouts: 0,
    pendingPayments: 0,
    cleaning: { clean: 0, dirty: 0, in_progress: 0, inspected: 0 },
    arrivals: [],
    departures: [],
    pendingReservations: [],
  }

  const today = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Bekliyor',
    confirmed: 'Onaylı',
    checked_in: 'Girişte',
  }
  const STATUS_COLORS: Record<string, string> = {
    pending: '#FCD34D',
    confirmed: '#93C5FD',
    checked_in: '#86EFAC',
  }

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Dashboard</h1>
        <p style={{ color: 'var(--color-admin-muted)' }} className="mt-1 text-sm capitalize">
          {today}
        </p>
      </div>

      {/* Pending rezervasyon uyarısı */}
      {metrics.pendingReservations.length > 0 && (
        <section>
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: '#1C1505', borderColor: '#D97706' }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} style={{ color: '#FCD34D', flexShrink: 0, marginTop: '1px' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#FCD34D' }}>
                  {metrics.pendingReservations.length} onay bekleyen rezervasyon var
                </p>
                <p className="text-xs mt-1" style={{ color: '#D4A017' }}>
                  Misafir sitesinden gelen rezervasyonlar — onaylamak veya iptal etmek için tıklayın
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {metrics.pendingReservations.slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      href={`/reservations/${r.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#2D1A00', color: '#FCD34D', border: '1px solid #D97706' }}
                    >
                      <span className="font-mono">{r.reservation_code}</span>
                      {r.guests && (
                        <span style={{ color: '#D4A017' }}>
                          · {r.guests.first_name} {r.guests.last_name}
                        </span>
                      )}
                      <span style={{ color: '#92681A' }}>· {r.check_in}</span>
                    </Link>
                  ))}
                  {metrics.pendingReservations.length > 5 && (
                    <Link
                      href="/reservations/list?status=pending"
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#2D1A00', color: '#D4A017', border: '1px solid #D97706' }}
                    >
                      +{metrics.pendingReservations.length - 5} daha →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6 Metrik Kartı */}
      <section>
        <h2 style={{ color: 'var(--color-admin-muted)' }} className="text-xs font-medium uppercase tracking-widest mb-4">
          Bugünün Durumu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            icon={<BedDouble size={16} />}
            label="Doluluk"
            value={formatPercent(metrics.occupancyRate)}
            description={`${metrics.occupiedRooms} / ${metrics.totalRooms} oda dolu`}
            accent
          />
          <MetricCard
            icon={<TrendingUp size={16} />}
            label="ADR"
            value={formatUZS(metrics.adr)}
            description="Ortalama günlük oda fiyatı"
            accent
          />
          <MetricCard
            icon={<BarChart3 size={16} />}
            label="RevPAR"
            value={formatUZS(metrics.revpar)}
            description="Mevcut oda başına gelir"
            accent
          />
          <MetricCard
            icon={<LogIn size={16} />}
            label="Bugün Giriş"
            value={String(metrics.checkins)}
            description="Bekleyen check-in rezervasyonları"
          />
          <MetricCard
            icon={<LogOut size={16} />}
            label="Bugün Çıkış"
            value={String(metrics.checkouts)}
            description="Bugün check-out yapacak misafirler"
          />
          <MetricCard
            icon={<CreditCard size={16} />}
            label="Bekleyen Ödeme"
            value={String(metrics.pendingPayments)}
            description="İşlem bekleyen ödeme kaydı"
          />
        </div>
      </section>

      {/* Bugünkü Giriş / Çıkış Listeleri */}
      <section>
        <h2 style={{ color: 'var(--color-admin-muted)' }} className="text-xs font-medium uppercase tracking-widest mb-4">
          Bugünkü Operasyon
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Arrivals */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--color-admin-border)', backgroundColor: '#0D1F14' }}
            >
              <LogIn size={14} style={{ color: '#86EFAC' }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#86EFAC' }}>
                Bugün Giriş ({metrics.arrivals.length})
              </p>
            </div>
            {metrics.arrivals.length === 0 ? (
              <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--color-admin-muted)' }}>
                Bugün için beklenen giriş yok
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
                {metrics.arrivals.map((r) => (
                  <Link
                    key={r.id}
                    href={`/reservations/${r.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#E8E8F0] truncate">
                        {r.guests?.first_name} {r.guests?.last_name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                        {r.rooms?.room_number ?? '—'} · {r.rooms?.room_types?.name ?? '—'} · {r.adults} kişi
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: STATUS_COLORS[r.status] ?? '#9CA3AF',
                          backgroundColor: `${STATUS_COLORS[r.status] ?? '#9CA3AF'}20`,
                        }}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Departures */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--color-admin-border)', backgroundColor: '#1A1405' }}
            >
              <LogOut size={14} style={{ color: '#FCD34D' }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FCD34D' }}>
                Bugün Çıkış ({metrics.departures.length})
              </p>
            </div>
            {metrics.departures.length === 0 ? (
              <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--color-admin-muted)' }}>
                Bugün için beklenen çıkış yok
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
                {metrics.departures.map((r) => (
                  <Link
                    key={r.id}
                    href={`/reservations/${r.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#E8E8F0] truncate">
                        {r.guests?.first_name} {r.guests?.last_name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                        {r.rooms?.room_number ?? '—'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0 ml-3" style={{ color: 'var(--color-accent)' }}>
                      {formatUZS(r.total_amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Son 30 Gün Grafikleri */}
      {chartData.length > 0 && (
        <section>
          <h2 style={{ color: 'var(--color-admin-muted)' }} className="text-xs font-medium uppercase tracking-widest mb-4">
            Son 30 Günlük Trend
          </h2>
          <MetricCharts data={chartData} />
        </section>
      )}

      {/* Oda Temizlik Durumu */}
      <section>
        <h2 style={{ color: 'var(--color-admin-muted)' }} className="text-xs font-medium uppercase tracking-widest mb-4">
          Oda Temizlik Durumu
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CleaningBadge
            label="Temiz"
            count={metrics.cleaning.clean}
            color="#2D6A4F"
            icon={<CheckCircle2 size={16} />}
          />
          <CleaningBadge
            label="Kirli"
            count={metrics.cleaning.dirty}
            color="#C62828"
            icon={<Wind size={16} />}
          />
          <CleaningBadge
            label="Temizleniyor"
            count={metrics.cleaning.in_progress}
            color="#D4A017"
            icon={<Clock size={16} />}
          />
          <CleaningBadge
            label="Denetlendi"
            count={metrics.cleaning.inspected}
            color="#C9A96E"
            icon={<Sparkles size={16} />}
          />
        </div>
      </section>
    </div>
  )
}
