import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { dash } from '@/lib/dashboardTheme'

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getLocalityLabel(nationality: string | null | undefined): string {
  if (!nationality) return '—'
  const n = nationality.toLowerCase()
  return n === 'özbekistan' || n === 'uzbekistan' ? 'Mahalliy' : 'Xorijiy'
}

function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface GuestInfo {
  first_name: string
  last_name: string
  nationality: string | null
}

interface RoomInfo {
  room_number: string
  room_types: { name: string } | null
}

interface CheckInRow {
  id: string
  expected_check_in_time: string | null
  adults: number
  children: number
  breakfast_included: boolean
  rooms: RoomInfo | null
  guests: GuestInfo | null
}

interface CheckOutRow {
  id: string
  adults: number
  children: number
  rooms: RoomInfo | null
  guests: GuestInfo | null
}

interface OccupiedRow {
  id: string
  check_out: string
  adults: number
  children: number
  breakfast_included: boolean
  rooms: RoomInfo | null
  guests: GuestInfo | null
}

// ─── Alt bileşenler ───────────────────────────────────────────────────────────

function StatBox({ value, label, color, bg }: { value: number | string; label: string; color: string; bg: string }) {
  return (
    <div
      className="rounded-xl px-4 py-4 text-center"
      style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: dash.muted }}>{label}</p>
    </div>
  )
}

function SectionHeader({ title, count, accent }: { title: string; count: number; accent: string }) {
  return (
    <div
      className="px-5 py-3 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--color-admin-border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{title}</p>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: accent + '22', color: accent }}
      >
        {count}
      </span>
    </div>
  )
}

function LocalityBadge({ nationality }: { nationality: string | null | undefined }) {
  const label = getLocalityLabel(nationality)
  const isLocal = label === 'Mahalliy'
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        backgroundColor: isLocal ? dash.greenLight : dash.orangeLight,
        color: isLocal ? dash.green : dash.orange,
      }}
    >
      {label}
    </span>
  )
}

function BreakfastBadge() {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: dash.greenLight, color: dash.green }}
    >
      Kahvaltı ✓
    </span>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="px-5 py-5 text-sm text-center" style={{ color: dash.muted }}>{text}</p>
  )
}

// ─── Sayfa ────────────────────────────────────────────────────────────────────

export default async function HousekeepingOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const todayStr = toDateStr(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toDateStr(tomorrow)

  const [checkInsRes, checkOutsRes, occupiedRes] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, expected_check_in_time, adults, children, breakfast_included, rooms(room_number, room_types(name)), guests(first_name, last_name, nationality)')
      .eq('check_in', tomorrowStr)
      .in('status', ['pending', 'confirmed'])
      .order('expected_check_in_time', { ascending: true, nullsFirst: false }),
    supabase
      .from('reservations')
      .select('id, adults, children, rooms(room_number, room_types(name)), guests(first_name, last_name, nationality)')
      .eq('check_out', todayStr)
      .eq('status', 'checked_in'),
    supabase
      .from('reservations')
      .select('id, check_out, adults, children, breakfast_included, rooms(room_number, room_types(name)), guests(first_name, last_name, nationality)')
      .eq('status', 'checked_in')
      .order('check_out', { ascending: true }),
  ])

  const checkIns = (checkInsRes.data ?? []) as unknown as CheckInRow[]
  const checkOuts = (checkOutsRes.data ?? []) as unknown as CheckOutRow[]
  const occupied = (occupiedRes.data ?? []) as unknown as OccupiedRow[]

  // Yarın sabah kahvaltısı: şu an otelde olan (check_out >= yarın) + kahvaltı dahil
  const breakfastCount = occupied
    .filter(r => r.check_out >= tomorrowStr && r.breakfast_included)
    .reduce((sum, r) => sum + r.adults + (r.children ?? 0), 0)

  const todayDisplay = today.toLocaleDateString('tr-TR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const tomorrowDisplay = tomorrow.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: dash.text }}>Günlük Özet</h1>
        <p className="text-sm mt-1" style={{ color: dash.muted }}>{todayDisplay}</p>
      </div>

      {/* Hızlı istatistikler */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox value={checkIns.length} label={`${tomorrowDisplay} girişleri`} color={dash.blue} bg={dash.blueLight} />
        <StatBox value={checkOuts.length} label="Bugünkü çıkışlar" color={dash.orange} bg={dash.orangeLight} />
        <StatBox value={`${breakfastCount} kişi`} label="Yarın sabah kahvaltı" color={dash.green} bg={dash.greenLight} />
      </div>

      {/* Yarınki Girişler */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHeader title={`Yarınki Girişler — ${tomorrowDisplay}`} count={checkIns.length} accent={dash.blue} />
        {checkIns.length === 0 ? (
          <EmptyRow text="Yarın giriş beklentisi yok." />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {checkIns.map(r => {
              const total = r.adults + (r.children ?? 0)
              const time = formatTime(r.expected_check_in_time)
              return (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-16 text-center shrink-0">
                    <p className="text-lg font-bold leading-tight" style={{ color: dash.text }}>
                      {r.rooms?.room_number ?? '?'}
                    </p>
                    <p className="text-[10px] leading-tight" style={{ color: dash.muted }}>
                      {r.rooms?.room_types?.name ?? ''}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: dash.text }}>
                      {r.guests?.first_name} {r.guests?.last_name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: dash.muted }}>{total} kişi</span>
                      <LocalityBadge nationality={r.guests?.nationality} />
                      {time && (
                        <span className="text-xs" style={{ color: dash.muted }}>⏰ {time}</span>
                      )}
                    </div>
                  </div>
                  {r.breakfast_included && <BreakfastBadge />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bugünkü Çıkışlar */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHeader title="Bugünkü Çıkışlar" count={checkOuts.length} accent={dash.orange} />
        {checkOuts.length === 0 ? (
          <EmptyRow text="Bugün çıkış beklentisi yok." />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {checkOuts.map(r => {
              const total = r.adults + (r.children ?? 0)
              return (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-16 text-center shrink-0">
                    <p className="text-lg font-bold leading-tight" style={{ color: dash.text }}>
                      {r.rooms?.room_number ?? '?'}
                    </p>
                    <p className="text-[10px] leading-tight" style={{ color: dash.muted }}>
                      {r.rooms?.room_types?.name ?? ''}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: dash.text }}>
                      {r.guests?.first_name} {r.guests?.last_name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: dash.muted }}>{total} kişi</span>
                      <LocalityBadge nationality={r.guests?.nationality} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Şu An Dolu Odalar */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHeader title="Şu An Dolu Odalar" count={occupied.length} accent={dash.primary} />
        {occupied.length === 0 ? (
          <EmptyRow text="Şu an dolu oda yok." />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {occupied.map(r => {
              const total = r.adults + (r.children ?? 0)
              return (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-16 text-center shrink-0">
                    <p className="text-lg font-bold leading-tight" style={{ color: dash.text }}>
                      {r.rooms?.room_number ?? '?'}
                    </p>
                    <p className="text-[10px] leading-tight" style={{ color: dash.muted }}>
                      {r.rooms?.room_types?.name ?? ''}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: dash.text }}>
                      {r.guests?.first_name} {r.guests?.last_name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: dash.muted }}>{total} kişi</span>
                      <LocalityBadge nationality={r.guests?.nationality} />
                      <span className="text-xs" style={{ color: dash.muted }}>Çıkış: {r.check_out}</span>
                    </div>
                  </div>
                  {r.breakfast_included && <BreakfastBadge />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
