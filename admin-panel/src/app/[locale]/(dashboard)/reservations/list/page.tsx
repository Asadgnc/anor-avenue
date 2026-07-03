import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReservationListClient from './ReservationListClient'
import type { ReservationStatus, Channel } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

interface ReservationRow {
  id: string
  reservation_code: string
  status: ReservationStatus
  check_in: string
  check_out: string
  nights: number
  adults: number
  total_amount: number
  channel: Channel
  created_at: string
  guests: { first_name: string; last_name: string; phone: string | null } | null
  rooms: { room_number: string; room_types: { name: string } | null } | null
}

type Props = {
  searchParams: Promise<{
    status?: string
    channel?: string
    createdOn?: string
    checkIn?: string
    checkOut?: string
  }>
}

const VALID_STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']
const VALID_CHANNELS: Channel[] = ['direct', 'booking_com', 'agoda', 'walk_in', 'phone']

export default async function ReservationListPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status, channel, createdOn, checkIn, checkOut } = await searchParams
  const filterStatus = (VALID_STATUSES.includes(status as ReservationStatus) ? status : 'all') as ReservationStatus | 'all'
  const filterChannel = (VALID_CHANNELS.includes(channel as Channel) ? channel : 'all') as Channel | 'all'

  let query = supabase
    .from('reservations')
    .select('id, reservation_code, status, check_in, check_out, nights, adults, total_amount, channel, created_at, guests(first_name, last_name, phone), rooms(room_number, room_types(name))')
    .order('check_in', { ascending: false })
    .limit(300)

  if (filterStatus !== 'all') query = query.eq('status', filterStatus)
  if (filterChannel !== 'all') query = query.eq('channel', filterChannel)
  if (checkIn) query = query.eq('check_in', checkIn)
  if (checkOut) query = query.eq('check_out', checkOut)
  if (createdOn) {
    const next = new Date(createdOn)
    next.setDate(next.getDate() + 1)
    query = query.gte('created_at', createdOn).lt('created_at', next.toISOString().split('T')[0])
  }

  const { data } = await query
  const reservations = (data ?? []) as unknown as ReservationRow[]

  const activeDateFilter = createdOn
    ? { label: `Oluşturulma: ${createdOn}`, clearHref: '/reservations/list' }
    : checkIn
      ? { label: `Giriş: ${checkIn}`, clearHref: '/reservations/list' }
      : checkOut
        ? { label: `Çıkış: ${checkOut}`, clearHref: '/reservations/list' }
        : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: dash.text }}>
            Rezervasyon Listesi
          </h1>
          <p className="mt-1 text-sm" style={{ color: dash.muted }}>
            {reservations.length} kayıt
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/reservations"
            className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: dash.card, color: dash.muted, boxShadow: dash.cardShadow }}
          >
            Takvim
          </Link>
          <Link
            href="/reservations/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 text-white"
            style={{ backgroundColor: dash.primary }}
          >
            + Yeni Rezervasyon
          </Link>
        </div>
      </div>

      {activeDateFilter && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: dash.primaryLight, color: dash.primary }}
          >
            {activeDateFilter.label}
          </span>
          <Link href={activeDateFilter.clearHref} className="text-xs" style={{ color: dash.muted }}>
            Filtreyi temizle ×
          </Link>
        </div>
      )}

      <ReservationListClient
        reservations={reservations}
        initialStatus={filterStatus}
        initialChannel={filterChannel}
        dateParams={{ createdOn, checkIn, checkOut }}
      />
    </div>
  )
}
