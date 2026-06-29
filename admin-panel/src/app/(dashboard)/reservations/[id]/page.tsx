import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ReservationActions from './ReservationActions'
import AddPaymentFormClient from './AddPaymentFormClient'
import CreateRegistrationForm from './CreateRegistrationForm'
import EditReservationFormClient from './EditReservationFormClient'
import DeletePaymentButton from './DeletePaymentButton'
import type { ReservationStatus, PaymentMethod, PaymentStatus } from '@/types/hotel'

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface ReservationDetail {
  id: string
  reservation_code: string
  status: ReservationStatus
  check_in: string
  check_out: string
  actual_check_in: string | null
  actual_check_out: string | null
  adults: number
  children: number
  nights: number
  room_rate: number
  total_amount: number
  discount: number
  currency: string
  special_requests: string | null
  notes: string | null
  channel: string
  rooms: { room_number: string; floor: number; room_types: { name: string } | null } | null
  guests: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    nationality: string | null
    passport_number: string | null
  } | null
}

interface PaymentRow {
  id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paid_at: string | null
  notes: string | null
  created_at: string
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Bekliyor',   color: '#D4A017', bg: '#451A03' },
  confirmed:   { label: 'Onaylı',     color: '#93C5FD', bg: '#1E3A5F' },
  checked_in:  { label: 'Girişte',    color: '#86EFAC', bg: '#14532D' },
  checked_out: { label: 'Çıktı',      color: '#9CA3AF', bg: '#1F2937' },
  cancelled:   { label: 'İptal',      color: '#6B7280', bg: '#1F2937' },
  no_show:     { label: 'Gelmedi',    color: '#FCA5A5', bg: '#450A0A' },
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  payme: 'Payme', click: 'Click', uzum: 'Uzum', cash: 'Nakit', transfer: 'Havale',
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

function Row({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
      <span style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      <span className="text-[#E8E8F0] text-right">{value}</span>
    </div>
  )
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [resResult, paymentsResult] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, reservation_code, status, check_in, check_out, actual_check_in, actual_check_out, adults, children, nights, room_rate, total_amount, discount, currency, special_requests, notes, channel, rooms(room_number, floor, room_types(name)), guests(id, first_name, last_name, email, phone, nationality, passport_number)')
      .eq('id', id)
      .single(),
    supabase
      .from('payments')
      .select('id, amount, currency, method, status, paid_at, notes, created_at')
      .eq('reservation_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (resResult.error || !resResult.data) notFound()

  const res = resResult.data as unknown as ReservationDetail
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[]
  const cfg = STATUS_CONFIG[res.status]

  const totalPaid = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const remaining = res.total_amount - totalPaid

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Başlık */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/reservations"
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}
        >
          ← Takvim
        </Link>
        <Link
          href={`/reservations/${id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
        >
          Fatura Yazdır
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-[#E8E8F0]">
              {res.guests?.first_name} {res.guests?.last_name}
            </h1>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-accent)' }}>
            {res.reservation_code}
          </p>
        </div>
      </div>

      {/* İşlemler (Check-in / Check-out / İptal) */}
      <ReservationActions reservationId={id} status={res.status} />

      {/* Rezervasyon Düzenleme */}
      {!['cancelled', 'no_show', 'checked_out'].includes(res.status) && (
        <EditReservationFormClient
          reservationId={id}
          checkIn={res.check_in}
          checkOut={res.check_out}
          adults={res.adults}
          roomRate={res.room_rate}
          specialRequests={res.special_requests}
          notes={res.notes}
        />
      )}

      {/* Rezervasyon Bilgileri */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          Rezervasyon
        </p>
        <div className="px-5 pb-2">
          <Row label="Oda" value={`${res.rooms?.room_number ?? '—'} · ${res.rooms?.room_types?.name ?? '—'}`} />
          <Row label="Giriş" value={res.check_in} />
          <Row label="Çıkış" value={res.check_out} />
          <Row label="Gece" value={String(res.nights ?? '—')} />
          <Row label="Yetişkin" value={String(res.adults)} />
          <Row label="Kanal" value={res.channel} />
          <Row label="Oda Fiyatı" value={formatUZS(res.room_rate) + '/gece'} />
          <Row label="Toplam Tutar" value={formatUZS(res.total_amount)} />
          <Row label="Ödenen" value={formatUZS(totalPaid)} />
          <Row
            label="Kalan"
            value={
              <span style={{ color: remaining > 0 ? '#FCD34D' : '#86EFAC', fontWeight: 700 }}>
                {formatUZS(remaining)}
              </span>
            }
          />
          {res.special_requests && (
            <Row label="Özel İstek" value={res.special_requests} />
          )}
          {res.notes && (
            <Row label="Notlar" value={res.notes} />
          )}
          {res.actual_check_in && (
            <Row label="Gerçek Giriş" value={new Date(res.actual_check_in).toLocaleString('tr-TR')} />
          )}
          {res.actual_check_out && (
            <Row label="Gerçek Çıkış" value={new Date(res.actual_check_out).toLocaleString('tr-TR')} />
          )}
        </div>
      </div>

      {/* Misafir Bilgileri */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          Misafir
        </p>
        <div className="px-5 pb-2">
          <Row label="Ad Soyad" value={`${res.guests?.first_name ?? ''} ${res.guests?.last_name ?? ''}`} />
          <Row label="Telefon" value={res.guests?.phone ?? '—'} />
          <Row label="E-posta" value={res.guests?.email ?? '—'} />
          <Row label="Milliyet" value={res.guests?.nationality ?? '—'} />
          <Row label="Pasaport" value={res.guests?.passport_number ?? '—'} />
        </div>
        {res.guests?.id && (
          <div className="px-5 pb-4 space-y-3">
            <Link
              href={`/guests/${res.guests.id}`}
              className="text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-accent)' }}
            >
              Misafir profilini aç →
            </Link>
            {res.guests.nationality && res.guests.nationality.toLowerCase() !== 'özbekistan' && res.guests.nationality.toLowerCase() !== 'uzbekistan' && (
              <div style={{ borderTop: '1px solid var(--color-admin-border)', paddingTop: '12px' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-admin-muted)' }}>
                  Kayıt (Registratsiya)
                </p>
                <CreateRegistrationForm guestId={res.guests.id} reservationId={id} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ödemeler */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
      >
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          Ödemeler
        </p>

        {payments.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            Henüz ödeme kaydı yok.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {payments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between text-sm gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[#E8E8F0] font-medium">{METHOD_LABELS[p.method]}</span>
                  {p.notes && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                      {p.notes}
                    </span>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                    {p.paid_at ? new Date(p.paid_at).toLocaleString('tr-TR') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                    {formatUZS(p.amount)}
                  </span>
                  <DeletePaymentButton paymentId={p.id} reservationId={id} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!['cancelled', 'no_show', 'checked_out'].includes(res.status) && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--color-admin-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-admin-muted)' }}>
              Ödeme Ekle
            </p>
            <AddPaymentFormClient reservationId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
