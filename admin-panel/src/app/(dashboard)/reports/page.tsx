import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatUZS(n: number) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' UZS'
}

async function fetchReportData(date: string) {
  const supabase = await createClient()

  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const [
    checkinsResult,
    checkoutsResult,
    paymentsResult,
    occupancyResult,
    totalRoomsResult,
  ] = await Promise.all([
    supabase.from('reservations').select('id, reservation_code, room_rate, guests(first_name, last_name), rooms(room_number)').eq('check_in', date).in('status', ['checked_in', 'confirmed', 'checked_out']),
    supabase.from('reservations').select('id, reservation_code, total_amount, guests(first_name, last_name), rooms(room_number)').eq('check_out', date).in('status', ['checked_out', 'checked_in']),
    supabase.from('payments').select('amount, method, status, created_at').gte('created_at', dayStart).lte('created_at', dayEnd).eq('status', 'completed'),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'occupied').eq('is_active', true),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const checkins = checkinsResult.data ?? []
  const checkouts = checkoutsResult.data ?? []
  const payments = paymentsResult.data ?? []
  const occupiedRooms = occupancyResult.count ?? 0
  const totalRooms = totalRoomsResult.count ?? 0
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0)
  const revenueByMethod: Record<string, number> = {}
  for (const p of payments) {
    revenueByMethod[p.method] = (revenueByMethod[p.method] ?? 0) + Number(p.amount)
  }

  return {
    checkins,
    checkouts,
    payments,
    totalRevenue,
    revenueByMethod,
    occupancyRate,
    occupiedRooms,
    totalRooms,
  }
}

interface CheckinRow {
  id: string
  reservation_code: string
  room_rate: number
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string } | null
}

interface CheckoutRow {
  id: string
  reservation_code: string
  total_amount: number
  guests: { first_name: string; last_name: string } | null
  rooms: { room_number: string } | null
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit', payme: 'Payme', click: 'Click', uzum: 'Uzum', transfer: 'Havale',
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = params.date ?? today

  const data = await fetchReportData(date).catch(() => null)
  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Günlük Rapor</h1>
        <p style={{ color: '#FCA5A5' }}>Rapor yüklenemedi.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Başlık + Tarih Seçici */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E8F0]">Günlük Rapor</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {new Date(date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <form method="get" className="flex gap-2 items-center">
            <input
              name="date"
              type="date"
              defaultValue={date}
              max={today}
              className="px-3 py-2 rounded-lg text-sm text-[#E8E8F0] focus:outline-none"
              style={{ backgroundColor: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
            >
              Görüntüle
            </button>
          </form>
          <a
            href={`/api/reports/export?date=${date}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)', color: '#E8E8F0' }}
          >
            ↓ Excel İndir
          </a>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Doluluk" value={`${data.occupancyRate.toFixed(0)}%`} sub={`${data.occupiedRooms}/${data.totalRooms} oda`} color="var(--color-accent)" />
        <SummaryCard label="Günlük Gelir" value={formatUZS(data.totalRevenue)} sub={`${data.payments.length} işlem`} color="#86EFAC" />
        <SummaryCard label="Check-in" value={String(data.checkins.length)} sub="misafir girişi" color="#93C5FD" />
        <SummaryCard label="Check-out" value={String(data.checkouts.length)} sub="misafir çıkışı" color="#D4A017" />
      </div>

      {/* Gelir Yöntem Dağılımı */}
      {Object.keys(data.revenueByMethod).length > 0 && (
        <Section title="Gelir Dağılımı">
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.revenueByMethod).map(([method, amount]) => (
              <div
                key={method}
                className="flex flex-col gap-1 px-4 py-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', minWidth: '120px' }}
              >
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>
                  {METHOD_LABELS[method] ?? method}
                </span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                  {formatUZS(amount)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Bugün Giriş Yapanlar */}
      <Section title={`Check-in Listesi (${data.checkins.length})`}>
        {data.checkins.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Bu tarihte check-in yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                {['Rezervasyon', 'Misafir', 'Oda', 'Oda Fiyatı'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.checkins as unknown as CheckinRow[]).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  <td className="py-2.5 px-3">
                    <Link href={`/reservations/${r.id}`} className="font-mono text-xs hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                      {r.reservation_code}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-[#E8E8F0]">{r.guests?.first_name} {r.guests?.last_name}</td>
                  <td className="py-2.5 px-3" style={{ color: 'var(--color-admin-muted)' }}>{r.rooms?.room_number ?? '—'}</td>
                  <td className="py-2.5 px-3 tabular-nums" style={{ color: 'var(--color-admin-muted)' }}>{formatUZS(r.room_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Bugün Çıkış Yapanlar */}
      <Section title={`Check-out Listesi (${data.checkouts.length})`}>
        {data.checkouts.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>Bu tarihte check-out yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                {['Rezervasyon', 'Misafir', 'Oda', 'Toplam'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.checkouts as unknown as CheckoutRow[]).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  <td className="py-2.5 px-3">
                    <Link href={`/reservations/${r.id}`} className="font-mono text-xs hover:opacity-80" style={{ color: 'var(--color-accent)' }}>
                      {r.reservation_code}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-[#E8E8F0]">{r.guests?.first_name} {r.guests?.last_name}</td>
                  <td className="py-2.5 px-3" style={{ color: 'var(--color-admin-muted)' }}>{r.rooms?.room_number ?? '—'}</td>
                  <td className="py-2.5 px-3 font-semibold tabular-nums" style={{ color: 'var(--color-accent)' }}>{formatUZS(r.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

// ─── Alt Bileşenler ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-admin-muted)' }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--color-admin-muted)' }}>{sub}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}
    >
      <p className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', borderBottom: '1px solid var(--color-admin-border)' }}>
        {title}
      </p>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
