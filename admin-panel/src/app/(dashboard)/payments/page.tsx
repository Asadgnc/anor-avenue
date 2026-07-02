import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Wallet, CreditCard } from 'lucide-react'
import type { Payment, PaymentMethod, PaymentStatus } from '@/types/hotel'
import SectionZone from '@/components/admin/SectionZone'
import StatusBadge, { type StatusTone } from '@/components/admin/StatusBadge'

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

const STATUS_CONFIG: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  pending:   { label: 'Bekliyor',   tone: 'warning' },
  completed: { label: 'Tamamlandı', tone: 'success' },
  failed:    { label: 'Başarısız',  tone: 'error' },
  refunded:  { label: 'İade',       tone: 'neutral' },
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ödemeler</h1>
        <p className="mt-1 text-sm text-muted-foreground">{rows.length} kayıt</p>
      </div>

      {/* Özet kartları */}
      <SectionZone tone="green" title="Ödeme Özeti" icon={<Wallet size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Toplam Gelir" value={formatUZS(totalCompleted)} accent="text-success" />
          <SummaryCard label="Bekleyen Ödeme" value={String(pendingCount)} accent="text-warning" />
          <SummaryCard label="Toplam Kayıt" value={String(rows.length)} accent="text-primary" />
        </div>
      </SectionZone>

      {/* Tablo */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CreditCard size={28} className="mx-auto mb-3 opacity-50" />
            <p>Henüz ödeme kaydı yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Rezervasyon', 'Misafir', 'Tutar', 'Yöntem', 'Durum', 'Tarih'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                      className="border-b border-border hover:bg-muted/50 transition-colors duration-150"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-foreground">
                        {p.reservations?.reservation_code ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-foreground">
                        {guest ? `${guest.first_name} ${guest.last_name}` : '—'}
                      </td>
                      <td className="px-5 py-3 font-semibold tabular-nums text-primary">
                        {formatUZS(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {METHOD_LABELS[p.method]}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={sc.tone}>{sc.label}</StatusBadge>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">
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

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  )
}
