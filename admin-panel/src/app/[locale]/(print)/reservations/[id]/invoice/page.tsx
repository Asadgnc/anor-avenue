import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { createServiceClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import PrintButton from './PrintButton'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoice')
  return { title: t('title') }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvoiceData {
  id: string
  reservation_code: string
  status: string
  check_in: string
  check_out: string
  nights: number
  adults: number
  children: number
  room_rate: number
  total_amount: number
  discount: number
  currency: string
  channel: string
  special_requests: string | null
  rooms: { room_number: string; floor: number; room_types: { name: string } | null } | null
  guests: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    nationality: string | null
    passport_number: string | null
    passport_series: string | null
    date_of_birth: string | null
    address: string | null
  } | null
}

interface PaymentRow {
  amount: number
  method: string
  status: string
  paid_at: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('invoice')
  const tMethods = await getTranslations('payments.methods')

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })

  const methodLabel = (method: string): string => {
    if (method === 'payme') return 'Payme'
    if (method === 'click') return 'Click'
    if (method === 'uzum') return 'Uzum'
    if (method === 'cash') return tMethods('cash')
    if (method === 'transfer') return tMethods('transfer')
    return method
  }

  const service = createServiceClient()

  const [resResult, paymentsResult, hotelResult] = await Promise.all([
    supabase
      .from('reservations')
      .select(`
        id, reservation_code, status, check_in, check_out, nights,
        adults, children, room_rate, total_amount, discount, currency, channel, special_requests,
        rooms(room_number, floor, room_types(name)),
        guests(first_name, last_name, email, phone, nationality, passport_number, passport_series, date_of_birth, address)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('payments')
      .select('amount, method, status, paid_at')
      .eq('reservation_id', id)
      .order('paid_at', { ascending: true }),
    service.from('hotel_settings').select('hotel_name, address, phone, email, website').eq('id', 1).single(),
  ])

  if (resResult.error || !resResult.data) notFound()

  const res = resResult.data as unknown as InvoiceData
  const payments = (paymentsResult.data ?? []) as PaymentRow[]
  const hotel = hotelResult.data ?? {
    hotel_name: 'Anor Avenue Hotel',
    address: 'Toshkent, O\'zbekiston',
    phone: '',
    email: '',
    website: '',
  }
  const completedPayments = payments.filter((p) => p.status === 'completed')
  const totalPaid = completedPayments.reduce((s, p) => s + p.amount, 0)
  const remaining = res.total_amount - totalPaid
  const todayStr = new Date().toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* Print CSS — active only when printing */}
      <style>{`
        @media print {
          @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
          body { background: white !important; }
          .print-hide { display: none !important; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; background: #F3F4F6; }
      `}</style>

      {/* Control bar — hidden when printing */}
      <div
        className="print-hide flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: '#1A1A2E', color: 'white' }}
      >
        <span className="text-sm font-medium opacity-70">{t('previewTitle')}</span>
        <PrintButton />
      </div>

      {/* Invoice paper */}
      <div
        className="mx-auto my-8 print:my-0 max-w-2xl bg-white shadow-lg print:shadow-none"
        style={{ padding: '40px 48px' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A2E', letterSpacing: '-0.5px' }}>
              {hotel.hotel_name.toUpperCase()}
            </h1>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {hotel.address && <>{hotel.address}<br /></>}
              {hotel.phone && <>{t('guestFields.phone')}{hotel.phone}<br /></>}
              {hotel.email && <>{hotel.email}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
              {t('invoiceLabel')}
            </p>
            <p className="text-xl font-bold" style={{ color: '#1A1A2E', fontFamily: 'monospace' }}>
              {res.reservation_code}
            </p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {t('dateLabel')}{todayStr}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '2px solid #1A1A2E', marginBottom: '24px' }} />

        {/* ── Guest & Reservation ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Guest */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
              {t('guestSection')}
            </p>
            <p className="font-semibold text-sm" style={{ color: '#111827' }}>
              {res.guests?.first_name} {res.guests?.last_name}
            </p>
            {res.guests?.nationality && (
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{t('guestFields.nationality')}{res.guests.nationality}</p>
            )}
            {res.guests?.passport_number && (
              <p className="text-xs" style={{ color: '#6B7280' }}>
                {t('guestFields.passport')}{res.guests.passport_series ? `${res.guests.passport_series} ` : ''}{res.guests.passport_number}
              </p>
            )}
            {res.guests?.date_of_birth && (
              <p className="text-xs" style={{ color: '#6B7280' }}>{t('guestFields.dob')}{formatDate(res.guests.date_of_birth)}</p>
            )}
            {res.guests?.phone && (
              <p className="text-xs" style={{ color: '#6B7280' }}>{t('guestFields.phone')}{res.guests.phone}</p>
            )}
            {res.guests?.email && (
              <p className="text-xs" style={{ color: '#6B7280' }}>{t('guestFields.email')}{res.guests.email}</p>
            )}
          </div>

          {/* Reservation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
              {t('reservationSection')}
            </p>
            <table className="w-full text-xs" style={{ color: '#374151' }}>
              <tbody>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>{t('reservationFields.room')}</td>
                  <td className="py-0.5 text-right font-medium">
                    {res.rooms?.room_number} · {res.rooms?.room_types?.name}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>{t('reservationFields.floor')}</td>
                  <td className="py-0.5 text-right">{res.rooms?.floor}{t('reservationFields.floorSuffix')}</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>{t('reservationFields.checkIn')}</td>
                  <td className="py-0.5 text-right">{formatDate(res.check_in)}</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>{t('reservationFields.checkOut')}</td>
                  <td className="py-0.5 text-right">{formatDate(res.check_out)}</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>{t('reservationFields.nightsAdults')}</td>
                  <td className="py-0.5 text-right">
                    {t('nightsAdultsValue', { nights: res.nights, adults: res.adults })}
                    {res.children ? ` ${t('childrenExtra', { n: res.children })}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>{t('reservationFields.channel')}</td>
                  <td className="py-0.5 text-right capitalize">{res.channel}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          {/* Table header */}
          <div
            className="grid grid-cols-12 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF', borderBottom: '1px solid #E5E7EB' }}
          >
            <span className="col-span-7">{t('lineHeaders.description')}</span>
            <span className="col-span-2 text-center">{t('lineHeaders.qty')}</span>
            <span className="col-span-3 text-right">{t('lineHeaders.amount')}</span>
          </div>

          {/* Room rent */}
          <div
            className="grid grid-cols-12 px-4 py-3 text-sm"
            style={{ borderBottom: '1px solid #F3F4F6', color: '#111827' }}
          >
            <span className="col-span-7">
              {t('lineItems.roomRent')}{res.rooms?.room_types?.name ?? t('reservationFields.room')}<br />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {t('lineItems.priceFormula', { price: formatUZS(res.room_rate), nights: res.nights })}
              </span>
            </span>
            <span className="col-span-2 text-center">{res.nights}</span>
            <span className="col-span-3 text-right font-medium">
              {formatUZS(res.room_rate * res.nights)}
            </span>
          </div>

          {/* Discount (if any) */}
          {res.discount > 0 && (
            <div
              className="grid grid-cols-12 px-4 py-3 text-sm"
              style={{ borderBottom: '1px solid #F3F4F6', color: '#111827' }}
            >
              <span className="col-span-7">{t('lineItems.discount')}</span>
              <span className="col-span-2 text-center">—</span>
              <span className="col-span-3 text-right" style={{ color: '#DC2626' }}>
                -{formatUZS(res.discount)}
              </span>
            </div>
          )}

          {/* Total */}
          <div
            className="grid grid-cols-12 px-4 py-3 text-sm font-bold"
            style={{ backgroundColor: '#F9FAFB', color: '#111827' }}
          >
            <span className="col-span-9">{t('total')}</span>
            <span className="col-span-3 text-right">{formatUZS(res.total_amount)}</span>
          </div>
        </div>

        {/* ── Payments ─────────────────────────────────────────────────── */}
        {completedPayments.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>
              {t('paymentsSection')}
            </p>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
              {completedPayments.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center px-4 py-2.5 text-sm"
                  style={{
                    borderBottom: i < completedPayments.length - 1 ? '1px solid #F3F4F6' : 'none',
                    color: '#374151',
                  }}
                >
                  <span>
                    {methodLabel(p.method)}
                    {p.paid_at && (
                      <span className="ml-2 text-xs" style={{ color: '#9CA3AF' }}>
                        {formatDate(p.paid_at)}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatUZS(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Balance ───────────────────────────────────────────────────── */}
        <div
          className="flex justify-between items-center px-4 py-3 rounded-lg"
          style={{
            backgroundColor: remaining > 0 ? '#FEF3C7' : '#D1FAE5',
            border: `1px solid ${remaining > 0 ? '#FCD34D' : '#6EE7B7'}`,
          }}
        >
          <span className="text-sm font-bold" style={{ color: remaining > 0 ? '#92400E' : '#065F46' }}>
            {remaining > 0 ? t('remaining') : t('fullyPaid')}
          </span>
          <span className="text-base font-bold" style={{ color: remaining > 0 ? '#92400E' : '#065F46' }}>
            {remaining > 0 ? formatUZS(remaining) : formatUZS(res.total_amount)}
          </span>
        </div>

        {/* Special request */}
        {res.special_requests && (
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            <span className="font-semibold">{t('specialRequest')}</span> {res.special_requests}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="mt-8" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            {t('footer', { hotel: hotel.hotel_name, date: todayStr })}<br />
            {[hotel.address, hotel.phone ? `${t('guestFields.phone')}${hotel.phone}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </>
  )
}
