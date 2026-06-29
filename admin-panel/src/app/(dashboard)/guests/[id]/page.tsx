import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReservationStatus } from '@/types/hotel'
import EditGuestFormClient from './EditGuestFormClient'

interface GuestDetail {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  passport_number: string | null
  passport_series: string | null
  date_of_birth: string | null
  address: string | null
  notes: string | null
  created_at: string
}

interface GuestReservation {
  id: string
  reservation_code: string
  status: ReservationStatus
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  rooms: { room_number: string; room_types: { name: string } | null } | null
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Bekliyor',
  confirmed: 'Onaylı',
  checked_in: 'Girişte',
  checked_out: 'Çıktı',
  cancelled: 'İptal',
  no_show: 'Gelmedi',
}

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: '#D4A017',
  confirmed: '#93C5FD',
  checked_in: '#86EFAC',
  checked_out: '#9CA3AF',
  cancelled: '#6B7280',
  no_show: '#FCA5A5',
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [guestResult, reservationsResult] = await Promise.all([
    supabase
      .from('guests')
      .select('id, first_name, last_name, email, phone, nationality, passport_number, passport_series, date_of_birth, address, notes, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('reservations')
      .select('id, reservation_code, status, check_in, check_out, nights, total_amount, rooms(room_number, room_types(name))')
      .eq('guest_id', id)
      .order('check_in', { ascending: false }),
  ])

  if (guestResult.error || !guestResult.data) notFound()

  const guest = guestResult.data as unknown as GuestDetail
  const reservations = (reservationsResult.data ?? []) as unknown as GuestReservation[]

  const totalSpent = reservations
    .filter((r) => !['cancelled', 'no_show'].includes(r.status))
    .reduce((s, r) => s + r.total_amount, 0)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Başlık */}
      <div className="flex items-center gap-4">
        <Link
          href="/guests"
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}
        >
          ← Misafirler
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">
            {guest.first_name} {guest.last_name}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {reservations.length} rezervasyon · {formatUZS(totalSpent)} toplam
          </p>
        </div>
      </div>

      {/* Kişisel Bilgiler — düzenlenebilir */}
      <EditGuestFormClient guest={guest} />

      {/* Rezervasyonlar */}
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          Rezervasyonlar ({reservations.length})
        </p>

        {reservations.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-admin-muted)' }}>Rezervasyon yok.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {reservations.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-mono text-[#E8E8F0]">{r.reservation_code}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                    {r.check_in} → {r.check_out} · {r.rooms?.room_number ?? '—'} {r.rooms?.room_types?.name ?? ''}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: STATUS_COLORS[r.status], backgroundColor: `${STATUS_COLORS[r.status]}20` }}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                  <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--color-accent)' }}>
                    {formatUZS(r.total_amount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
