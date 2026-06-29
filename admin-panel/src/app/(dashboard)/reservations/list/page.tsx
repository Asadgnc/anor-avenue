import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReservationListClient from './ReservationListClient'
import type { ReservationStatus } from '@/types/hotel'

interface ReservationRow {
  id: string
  reservation_code: string
  status: ReservationStatus
  check_in: string
  check_out: string
  nights: number
  adults: number
  total_amount: number
  channel: string
  created_at: string
  guests: { first_name: string; last_name: string; phone: string | null } | null
  rooms: { room_number: string; room_types: { name: string } | null } | null
}

type Props = {
  searchParams: Promise<{ status?: string }>
}

export default async function ReservationListPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status } = await searchParams
  const validStatuses: ReservationStatus[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show']
  const filterStatus = (validStatuses.includes(status as ReservationStatus) ? status : 'all') as ReservationStatus | 'all'

  let query = supabase
    .from('reservations')
    .select('id, reservation_code, status, check_in, check_out, nights, adults, total_amount, channel, created_at, guests(first_name, last_name, phone), rooms(room_number, room_types(name))')
    .order('check_in', { ascending: false })
    .limit(300)

  if (filterStatus !== 'all') {
    query = query.eq('status', filterStatus)
  }

  const { data } = await query
  const reservations = (data ?? []) as unknown as ReservationRow[]

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">Rezervasyon Listesi</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {reservations.length} kayıt
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/reservations"
            className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', border: '1px solid var(--color-admin-border)' }}
          >
            📅 Takvim
          </Link>
          <Link
            href="/reservations/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
          >
            + Yeni Rezervasyon
          </Link>
        </div>
      </div>

      {/* Client-side arama + filtre + tablo */}
      <ReservationListClient reservations={reservations} initialStatus={filterStatus} />
    </div>
  )
}
