import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import ReservationActions from './ReservationActions'
import AddPaymentFormClient from './AddPaymentFormClient'
import CreateRegistrationForm from './CreateRegistrationForm'
import EditReservationFormClient from './EditReservationFormClient'
import DeletePaymentButton from './DeletePaymentButton'
import CompleteRegistrationButton from './CompleteRegistrationButton'
import type { ReservationStatus, PaymentMethod, PaymentStatus } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  breakfast_included: boolean
  expected_check_in_time: string | null
  may_extend: boolean
  registration_pending: boolean
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReservationStatus, { color: string; bg: string }> = {
  pending:     { color: dash.orange, bg: dash.orangeLight },
  confirmed:   { color: dash.blue,   bg: dash.blueLight },
  checked_in:  { color: dash.green,  bg: dash.greenLight },
  checked_out: { color: dash.muted,  bg: dash.border },
  cancelled:   { color: dash.muted,  bg: dash.border },
  no_show:     { color: dash.red,    bg: dash.redLight },
}

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

function Row({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
      <span style={{ color: 'var(--color-admin-muted)' }}>{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('reservations.detail')
  const tf = await getTranslations('reservations.detail.fields')
  const ts = await getTranslations('reservations.detail.sections')
  const tStatus = await getTranslations('status.reservation')
  const tMethods = await getTranslations('reservations.methods')
  const tg = await getTranslations('guests.headers')
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'

  const methodLabel = (m: PaymentMethod): string => {
    if (m === 'cash') return tMethods('cash')
    if (m === 'transfer') return tMethods('transfer')
    if (m === 'payme') return 'Payme'
    if (m === 'click') return 'Click'
    return 'Uzum'
  }

  const [resResult, paymentsResult] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, reservation_code, status, check_in, check_out, actual_check_in, actual_check_out, adults, children, nights, room_rate, total_amount, discount, currency, special_requests, notes, channel, breakfast_included, expected_check_in_time, may_extend, registration_pending, rooms(room_number, floor, room_types(name)), guests(id, first_name, last_name, email, phone, nationality, passport_number)')
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
  const cfg = STATUS_COLORS[res.status]

  // Pasaport görselleri — SADECE admin (imzalı URL server'da üretilir)
  const role = (user.user_metadata?.role as string | undefined) ?? ''
  let passportImages: string[] = []
  if (role === 'admin') {
    const service = createServiceClient()
    const { data: scans } = await service
      .from('passport_scans')
      .select('storage_path')
      .eq('reservation_id', id)
      .order('slot_index', { ascending: true })
    const paths = (scans ?? []).map((s: { storage_path: string }) => s.storage_path)
    if (paths.length > 0) {
      const signed = await Promise.all(
        paths.map((p) => service.storage.from('passports').createSignedUrl(p, 60 * 10))
      )
      passportImages = signed
        .map((s) => s.data?.signedUrl)
        .filter((u): u is string => Boolean(u))
    }
  }
  const tRoom = await getTranslations('roomDetail')

  const totalPaid = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const remaining = res.total_amount - totalPaid

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/reservations"
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          {t('backLink')}
        </Link>
        <Link
          href={`/reservations/${id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {t('printInvoice')}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">
              {res.guests?.first_name} {res.guests?.last_name}
            </h1>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              {tStatus(res.status)}
            </span>
          </div>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-accent)' }}>
            {res.reservation_code}
          </p>
        </div>
      </div>

      {/* Yarı kayıt → tam kayıt tamamla */}
      {res.registration_pending && <CompleteRegistrationButton reservationId={id} />}

      {/* Actions (check-in / check-out / cancel / no-show) */}
      <ReservationActions reservationId={id} status={res.status} checkIn={res.check_in} />

      {/* Edit reservation */}
      {!['cancelled', 'no_show', 'checked_out'].includes(res.status) && (
        <EditReservationFormClient
          reservationId={id}
          checkIn={res.check_in}
          checkOut={res.check_out}
          adults={res.adults}
          roomRate={res.room_rate}
          specialRequests={res.special_requests}
          notes={res.notes}
          breakfastIncluded={res.breakfast_included}
          expectedCheckInTime={res.expected_check_in_time}
          mayExtend={res.may_extend}
        />
      )}

      {/* Reservation info */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          {ts('reservation')}
        </p>
        <div className="px-5 pb-2">
          <Row label={tf('room')} value={`${res.rooms?.room_number ?? '—'} · ${res.rooms?.room_types?.name ?? '—'}`} />
          <Row label={tf('checkIn')} value={res.check_in} />
          <Row label={tf('checkOut')} value={res.check_out} />
          <Row label={tf('nights')} value={String(res.nights ?? '—')} />
          <Row label={tf('adults')} value={String(res.adults)} />
          <Row label={tf('channel')} value={res.channel} />
          <Row label={tf('roomPrice')} value={formatUZS(res.room_rate) + t('perNight')} />
          <Row label={tf('totalAmount')} value={formatUZS(res.total_amount)} />
          <Row label={tf('paid')} value={formatUZS(totalPaid)} />
          <Row
            label={tf('remaining')}
            value={
              <span style={{ color: remaining > 0 ? dash.orange : dash.green, fontWeight: 700 }}>
                {formatUZS(remaining)}
              </span>
            }
          />
          {res.special_requests && (
            <Row label={tf('specialRequest')} value={res.special_requests} />
          )}
          {res.notes && (
            <Row label={tf('notes')} value={res.notes} />
          )}
          {res.expected_check_in_time && (
            <Row label={tf('expectedCheckIn')} value={res.expected_check_in_time.slice(0, 5)} />
          )}
          <Row
            label={tf('breakfast')}
            value={
              <span style={{ color: res.breakfast_included ? dash.green : dash.muted, fontWeight: res.breakfast_included ? 600 : 400 }}>
                {res.breakfast_included ? t('breakfastIncluded') : t('breakfastNotIncluded')}
              </span>
            }
          />
          <Row
            label={tf('mayExtend')}
            value={
              <span style={{ color: res.may_extend ? dash.orange : dash.green, fontWeight: res.may_extend ? 600 : 400 }}>
                {res.may_extend ? t('mayExtendUncertain') : t('mayExtendCertain')}
              </span>
            }
          />
          {res.actual_check_in && (
            <Row label={tf('actualCheckIn')} value={new Date(res.actual_check_in).toLocaleString(dateLocale)} />
          )}
          {res.actual_check_out && (
            <Row label={tf('actualCheckOut')} value={new Date(res.actual_check_out).toLocaleString(dateLocale)} />
          )}
        </div>
      </div>

      {/* Guest info */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          {ts('guest')}
        </p>
        <div className="px-5 pb-2">
          <Row label={tg('name')} value={`${res.guests?.first_name ?? ''} ${res.guests?.last_name ?? ''}`} />
          <Row label={tg('phone')} value={res.guests?.phone ?? '—'} />
          <Row label={tg('email')} value={res.guests?.email ?? '—'} />
          <Row label={tg('nationality')} value={res.guests?.nationality ?? '—'} />
          <Row label={tg('passport')} value={res.guests?.passport_number ?? '—'} />
        </div>
        {res.guests?.id && (
          <div className="px-5 pb-4 space-y-3">
            <Link
              href={`/guests/${res.guests.id}`}
              className="text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('guestProfileLink')}
            </Link>
            {res.guests.nationality && !['özbekistan', 'uzbekistan', 'узбекистан', 'oʻzbekiston', 'o‘zbekiston'].includes(res.guests.nationality.toLowerCase()) && (
              <div style={{ borderTop: '1px solid var(--color-admin-border)', paddingTop: '12px' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-admin-muted)' }}>
                  {ts('registration')}
                </p>
                <CreateRegistrationForm guestId={res.guests.id} reservationId={id} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pasaport görselleri — yalnızca admin */}
      {role === 'admin' && passportImages.length > 0 && (
        <div
          className="rounded-2xl"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
            {tRoom('passportImages')}
          </p>
          <div className="px-5 py-4 flex flex-wrap gap-3">
            {passportImages.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-2 rounded-lg hover:opacity-80"
                style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-accent)' }}
              >
                {tRoom('passportImageN', { n: i + 1 })}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Payments */}
      <div
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
          {ts('payments')}
        </p>

        {payments.length === 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {t('noPayments')}
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-admin-border)' }}>
            {payments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between text-sm gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-foreground font-medium">{methodLabel(p.method)}</span>
                  {p.notes && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-admin-muted)' }}>
                      {p.notes}
                    </span>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                    {p.paid_at ? new Date(p.paid_at).toLocaleString(dateLocale) : ''}
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
              {ts('addPayment')}
            </p>
            <AddPaymentFormClient reservationId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
