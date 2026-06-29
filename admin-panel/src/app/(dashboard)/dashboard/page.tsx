import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
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
} from 'lucide-react'
import MetricCharts from '@/components/admin/MetricCharts'

// ─── Veri çekme ────────────────────────────────────────────────────────────────

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
  }

  const today = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Dashboard</h1>
        <p style={{ color: 'var(--color-admin-muted)' }} className="mt-1 text-sm capitalize">
          {today}
        </p>
      </div>

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
