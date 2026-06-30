import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PrintButton from './PrintButton'

export const metadata: Metadata = { title: 'Fatura — Anor Avenue' }

// ─── Tipler ──────────────────────────────────────────────────────────────────

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

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const METHOD_LABELS: Record<string, string> = {
  payme: 'Payme', click: 'Click', uzum: 'Uzum', cash: 'Nakit', transfer: 'Banka havalesi',
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
  const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* Print CSS — sadece yazdırırken aktif */}
      <style>{`
        @media print {
          @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
          body { background: white !important; }
          .print-hide { display: none !important; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; background: #F3F4F6; }
      `}</style>

      {/* Kontrol Çubuğu — yazdırırken gizlenir */}
      <div
        className="print-hide flex items-center justify-between px-6 py-3"
        style={{ backgroundColor: '#1A1A2E', color: 'white' }}
      >
        <span className="text-sm font-medium opacity-70">Fatura Önizleme</span>
        <PrintButton />
      </div>

      {/* Fatura Kağıdı */}
      <div
        className="mx-auto my-8 print:my-0 max-w-2xl bg-white shadow-lg print:shadow-none"
        style={{ padding: '40px 48px' }}
      >
        {/* ── Başlık ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A2E', letterSpacing: '-0.5px' }}>
              {hotel.hotel_name.toUpperCase()}
            </h1>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {hotel.address && <>{hotel.address}<br /></>}
              {hotel.phone && <>Tel: {hotel.phone}<br /></>}
              {hotel.email && <>{hotel.email}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
              Fatura / Квитанция
            </p>
            <p className="text-xl font-bold" style={{ color: '#1A1A2E', fontFamily: 'monospace' }}>
              {res.reservation_code}
            </p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              Düzenleme: {todayStr}
            </p>
          </div>
        </div>

        {/* Ayırıcı */}
        <div style={{ borderTop: '2px solid #1A1A2E', marginBottom: '24px' }} />

        {/* ── Misafir & Rezervasyon ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Misafir */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
              Misafir / Mehmon
            </p>
            <p className="font-semibold text-sm" style={{ color: '#111827' }}>
              {res.guests?.first_name} {res.guests?.last_name}
            </p>
            {res.guests?.nationality && (
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Milliyet: {res.guests.nationality}</p>
            )}
            {res.guests?.passport_number && (
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Pasaport: {res.guests.passport_series ? `${res.guests.passport_series} ` : ''}{res.guests.passport_number}
              </p>
            )}
            {res.guests?.date_of_birth && (
              <p className="text-xs" style={{ color: '#6B7280' }}>D.Tarihi: {formatDate(res.guests.date_of_birth)}</p>
            )}
            {res.guests?.phone && (
              <p className="text-xs" style={{ color: '#6B7280' }}>Tel: {res.guests.phone}</p>
            )}
            {res.guests?.email && (
              <p className="text-xs" style={{ color: '#6B7280' }}>E-posta: {res.guests.email}</p>
            )}
          </div>

          {/* Rezervasyon */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
              Rezervasyon / Бронь
            </p>
            <table className="w-full text-xs" style={{ color: '#374151' }}>
              <tbody>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>Oda</td>
                  <td className="py-0.5 text-right font-medium">
                    {res.rooms?.room_number} · {res.rooms?.room_types?.name}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>Kat</td>
                  <td className="py-0.5 text-right">{res.rooms?.floor}. kat</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>Giriş</td>
                  <td className="py-0.5 text-right">{formatDate(res.check_in)}</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>Çıkış</td>
                  <td className="py-0.5 text-right">{formatDate(res.check_out)}</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>Gece / Kişi</td>
                  <td className="py-0.5 text-right">{res.nights} gece · {res.adults} yetişkin{res.children ? ` + ${res.children} çocuk` : ''}</td>
                </tr>
                <tr>
                  <td className="py-0.5" style={{ color: '#9CA3AF' }}>Kanal</td>
                  <td className="py-0.5 text-right capitalize">{res.channel}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Kalemler ─────────────────────────────────────────────────── */}
        <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          {/* Tablo Başlığı */}
          <div
            className="grid grid-cols-12 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF', borderBottom: '1px solid #E5E7EB' }}
          >
            <span className="col-span-7">Açıklama</span>
            <span className="col-span-2 text-center">Adet</span>
            <span className="col-span-3 text-right">Tutar</span>
          </div>

          {/* Oda Kirası */}
          <div
            className="grid grid-cols-12 px-4 py-3 text-sm"
            style={{ borderBottom: '1px solid #F3F4F6', color: '#111827' }}
          >
            <span className="col-span-7">
              Oda kirası — {res.rooms?.room_types?.name ?? 'Oda'}<br />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {formatUZS(res.room_rate)} × {res.nights} gece
              </span>
            </span>
            <span className="col-span-2 text-center">{res.nights}</span>
            <span className="col-span-3 text-right font-medium">
              {formatUZS(res.room_rate * res.nights)}
            </span>
          </div>

          {/* İndirim (varsa) */}
          {res.discount > 0 && (
            <div
              className="grid grid-cols-12 px-4 py-3 text-sm"
              style={{ borderBottom: '1px solid #F3F4F6', color: '#111827' }}
            >
              <span className="col-span-7">İndirim</span>
              <span className="col-span-2 text-center">—</span>
              <span className="col-span-3 text-right" style={{ color: '#DC2626' }}>
                -{formatUZS(res.discount)}
              </span>
            </div>
          )}

          {/* Toplam */}
          <div
            className="grid grid-cols-12 px-4 py-3 text-sm font-bold"
            style={{ backgroundColor: '#F9FAFB', color: '#111827' }}
          >
            <span className="col-span-9">TOPLAM / JAMI</span>
            <span className="col-span-3 text-right">{formatUZS(res.total_amount)}</span>
          </div>
        </div>

        {/* ── Ödemeler ─────────────────────────────────────────────────── */}
        {completedPayments.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>
              Alınan Ödemeler / To'lovlar
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
                    {METHOD_LABELS[p.method] ?? p.method}
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

        {/* ── Bakiye ───────────────────────────────────────────────────── */}
        <div
          className="flex justify-between items-center px-4 py-3 rounded-lg"
          style={{
            backgroundColor: remaining > 0 ? '#FEF3C7' : '#D1FAE5',
            border: `1px solid ${remaining > 0 ? '#FCD34D' : '#6EE7B7'}`,
          }}
        >
          <span className="text-sm font-bold" style={{ color: remaining > 0 ? '#92400E' : '#065F46' }}>
            {remaining > 0 ? 'KALAN BAKIYE / QOLDIQ' : 'TAM ÖDENDİ / TO\'LIQ TO\'LANGAN'}
          </span>
          <span className="text-base font-bold" style={{ color: remaining > 0 ? '#92400E' : '#065F46' }}>
            {remaining > 0 ? formatUZS(remaining) : formatUZS(res.total_amount)}
          </span>
        </div>

        {/* Özel istek */}
        {res.special_requests && (
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            <span className="font-semibold">Özel İstek:</span> {res.special_requests}
          </div>
        )}

        {/* ── Alt Bilgi ────────────────────────────────────────────────── */}
        <div className="mt-8" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            Bu belge {hotel.hotel_name} tarafından {todayStr} tarihinde düzenlenmiştir.<br />
            {[hotel.address, hotel.phone ? `Tel: ${hotel.phone}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </>
  )
}
