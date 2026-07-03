import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
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

const STATUS_COLORS: Record<ReservationStatus, { color: string; bg: string }> = {
  pending: { color: '#F59E0B', bg: '#FEF3E2' },
  confirmed: { color: '#3B82F6', bg: '#E8EFFE' },
  checked_in: { color: '#22C55E', bg: '#E7F9EE' },
  checked_out: { color: '#8A8AA3', bg: '#ECEEF5' },
  cancelled: { color: '#8A8AA3', bg: '#ECEEF5' },
  no_show: { color: '#EF4444', bg: '#FDEAEA' },
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('guests.detail')
  const tStatus = await getTranslations('status.reservation')

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/guests"
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          {t('backLink')}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {guest.first_name} {guest.last_name}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {t('subtitle', { n: reservations.length, total: formatUZS(totalSpent) })}
          </p>
        </div>
      </div>

      {/* Personal info — editable */}
      <EditGuestFormClient guest={guest} />

      {/* Reservations */}
      <div className="rounded-2xl" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          {t('reservationsSection', { n: reservations.length })}
        </p>

        {reservations.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('noReservations')}</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {reservations.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-black/[0.03] transition-colors"
              >
                <div>
                  <p className="text-sm font-mono text-foreground">{r.reservation_code}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                    {r.check_in} → {r.check_out} · {r.rooms?.room_number ?? '—'} {r.rooms?.room_types?.name ?? ''}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: STATUS_COLORS[r.status].color, backgroundColor: STATUS_COLORS[r.status].bg }}
                  >
                    {tStatus(r.status)}
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
