import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReservationCalendar from '@/components/admin/ReservationCalendar'
import CalendarNav from '@/components/admin/CalendarNav'
import type { Room, Reservation } from '@/types/hotel'

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

type Props = {
  searchParams: Promise<{ start?: string }>
}

export default async function ReservationsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { start } = await searchParams
  const today = new Date().toISOString().split('T')[0]

  // start parametresi yoksa bugün, geçmişe gidemez (3 ay öncesine kadar izin ver)
  const minDate = addDays(today, -90)
  const startDate = start && start >= minDate ? start : today
  const endDate = addDays(startDate, 14)

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
      .gte('check_out', startDate),
  ])

  const rooms = (roomsResult.data ?? []) as unknown as Room[]
  const reservations = (reservationsResult.data ?? []) as unknown as Reservation[]

  const prevStart = addDays(startDate, -14)
  const nextStart = addDays(startDate, 14)
  const isToday = startDate === today

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">Rezervasyon Takvimi</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {startDate} — {endDate} · {rooms.length} oda
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Liste görünümü */}
          <Link
            href="/reservations/list"
            className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-admin-card)', color: 'var(--color-admin-muted)', border: '1px solid var(--color-admin-border)' }}
          >
            ☰ Liste
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

      {/* Navigasyon */}
      <CalendarNav
        prevStart={prevStart}
        nextStart={nextStart}
        isToday={isToday}
        today={today}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Takvim */}
      <ReservationCalendar
        rooms={rooms}
        reservations={reservations}
        startDate={startDate}
      />
    </div>
  )
}
