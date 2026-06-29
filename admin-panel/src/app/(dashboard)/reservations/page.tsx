import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReservationCalendar from '@/components/admin/ReservationCalendar'
import type { Room, Reservation } from '@/types/hotel'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default async function ReservationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const endDate = addDays(today, 14)

  const [roomsResult, reservationsResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, floor, status, cleaning_status, is_active, notes, room_type_id, room_types(name, base_price)')
      .eq('is_active', true)
      .order('floor')
      .order('room_number'),
    supabase
      .from('reservations')
      .select(
        'id, reservation_code, room_id, guest_id, channel, status, check_in, check_out, adults, children, nights, room_rate, total_amount, discount, currency, special_requests, notes, guests(first_name, last_name)'
      )
      .in('status', ['pending', 'confirmed', 'checked_in', 'checked_out'])
      .lte('check_in', endDate)
      .gte('check_out', today),
  ])

  const rooms = (roomsResult.data ?? []) as unknown as Room[]
  const reservations = (reservationsResult.data ?? []) as unknown as Reservation[]

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">Rezervasyon Takvimi</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {today} — {endDate} · {rooms.length} oda
          </p>
        </div>
        <Link
          href="/reservations/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
        >
          + Yeni Rezervasyon
        </Link>
      </div>

      {/* Takvim */}
      <ReservationCalendar
        rooms={rooms}
        reservations={reservations}
        startDate={today}
      />
    </div>
  )
}
