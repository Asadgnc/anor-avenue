import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/hotel'

interface PaymentWithReservation extends Payment {
  reservations: {
    reservation_code: string
    guests: { first_name: string; last_name: string } | null
  } | null
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  payme: 'Payme',
  click: 'Click',
  uzum: 'Uzum',
  cash: 'Nakit',
  transfer: 'Havale',
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  pending:   { label: 'Bekliyor',   color: '#D4A017' },
  completed: { label: 'Tamamlandı', color: '#2D6A4F' },
  failed:    { label: 'Başarısız',  color: '#C62828' },
  refunded:  { label: 'İade',       color: '#8B8BAD' },
}

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) + ' UZS'
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, reservation_id, amount, currency, method, status, paid_at, notes, created_at, reservations(reservation_code, guests(first_name, last_name))')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (payments ?? []) as unknown as PaymentWithReservation[]

  const totalCompleted = rows
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingCount = rows.filter((p) => p.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Ödemeler</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
          {rows.length} kayıt
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Toplam Gelir" value={formatUZS(totalCompleted)} color="#2D6A4F" />
        <SummaryCard label="Bekleyen Ödeme" value={String(pendingCount)} color="#D4A017" />
        <SummaryCard label="Toplam Kayıt" value={String(rows.length)} color="var(--color-accent)" />
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: 'var(--color-admin-card)',
          borderRadius: '0.75rem',
          border: '1px solid var(--color-admin-border)',
          overflow: 'hidden',
        }}
      >
        {rows.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--color-admin-muted)' }}>
            <p className="text-4xl mb-3">💳</p>
            <p>Henüz ödeme kaydı yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
                  {['Rezervasyon', 'Misafir', 'Tutar', 'Yöntem', 'Durum', 'Tarih'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--color-admin-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const sc = STATUS_CONFIG[p.status]
                  const guest = p.reservations?.guests
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid var(--color-admin-border)' }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-[#E8E8F0]">
                        {p.reservations?.reservation_code ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-[#E8E8F0]">
                        {guest ? `${guest.first_name} ${guest.last_name}` : '—'}
                      </td>
                      <td className="px-5 py-3 font-semibold" style={{ color: 'var(--color-accent)' }}>
                        {formatUZS(p.amount)}
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                        {METHOD_LABELS[p.method]}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          style={{
                            color: sc.color,
                            backgroundColor: `${sc.color}1A`,
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                          }}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--color-admin-muted)' }}>
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString('tr-TR')
                          : new Date(p.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-admin-card)',
        border: '1px solid var(--color-admin-border)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-admin-muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
