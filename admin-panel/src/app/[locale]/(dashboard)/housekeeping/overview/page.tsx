import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { dash } from '@/lib/dashboardTheme'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function isLocalNationality(nationality: string | null | undefined): boolean {
  if (!nationality) return false
  const n = nationality.toLowerCase()
  return n === 'özbekistan' || n === 'uzbekistan' || n === 'узбекистан' || n === 'oʻzbekiston' || n === 'o‘zbekiston'
}

function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ value, label, color }: { value: number | string; label: string; color: string }) {
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

function LocalityBadge({ nationality, localLabel, foreignLabel }: { nationality: string | null | undefined; localLabel: string; foreignLabel: string }) {
  const isLocal = isLocalNationality(nationality)
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        backgroundColor: isLocal ? dash.greenLight : dash.orangeLight,
        color: isLocal ? dash.green : dash.orange,
      }}
    >
      {isLocal ? localLabel : foreignLabel}
    </span>
  )
}

function BreakfastBadge({ label }: { label: string }) {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: dash.greenLight, color: dash.green }}
    >
      {label}
    </span>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="px-5 py-5 text-sm text-center" style={{ color: dash.muted }}>{text}</p>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function HousekeepingOverviewPage() {
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const locale = await getLocale()
  const t = await getTranslations('housekeeping.overview')
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'

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

  // Tomorrow's breakfast: currently in hotel (check_out >= tomorrow) + breakfast included
  const breakfastCount = occupied
    .filter(r => r.check_out >= tomorrowStr && r.breakfast_included)
    .reduce((sum, r) => sum + r.adults + (r.children ?? 0), 0)

  const todayDisplay = today.toLocaleDateString(dateLocale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const tomorrowDisplay = tomorrow.toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const localLabel = t('local')
  const foreignLabel = t('foreign')

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: dash.text }}>{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: dash.muted }}>{todayDisplay}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox value={checkIns.length} label={t('tomorrowCheckIns')} color={dash.blue} />
        <StatBox value={checkOuts.length} label={t('todayCheckOuts')} color={dash.orange} />
        <StatBox value={t('persons', { n: breakfastCount })} label={t('tomorrowBreakfast')} color={dash.green} />
      </div>

      {/* Tomorrow's check-ins */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHeader title={t('sections.checkIns', { date: tomorrowDisplay })} count={checkIns.length} accent={dash.blue} />
        {checkIns.length === 0 ? (
          <EmptyRow text={t('empty.checkIns')} />
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
                      <span className="text-xs" style={{ color: dash.muted }}>{t('persons', { n: total })}</span>
                      <LocalityBadge nationality={r.guests?.nationality} localLabel={localLabel} foreignLabel={foreignLabel} />
                      {time && (
                        <span className="text-xs" style={{ color: dash.muted }}>⏰ {time}</span>
                      )}
                    </div>
                  </div>
                  {r.breakfast_included && <BreakfastBadge label={t('breakfastBadge')} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Today's check-outs */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHeader title={t('sections.checkOuts')} count={checkOuts.length} accent={dash.orange} />
        {checkOuts.length === 0 ? (
          <EmptyRow text={t('empty.checkOuts')} />
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
                      <span className="text-xs" style={{ color: dash.muted }}>{t('persons', { n: total })}</span>
                      <LocalityBadge nationality={r.guests?.nationality} localLabel={localLabel} foreignLabel={foreignLabel} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Currently occupied rooms */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <SectionHeader title={t('sections.occupiedRooms')} count={occupied.length} accent={dash.primary} />
        {occupied.length === 0 ? (
          <EmptyRow text={t('empty.occupied')} />
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
                      <span className="text-xs" style={{ color: dash.muted }}>{t('persons', { n: total })}</span>
                      <LocalityBadge nationality={r.guests?.nationality} localLabel={localLabel} foreignLabel={foreignLabel} />
                      <span className="text-xs" style={{ color: dash.muted }}>{t('checkOutLabel', { date: r.check_out })}</span>
                    </div>
                  </div>
                  {r.breakfast_included && <BreakfastBadge label={t('breakfastBadge')} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
