import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Wallet, CreditCard } from 'lucide-react'
import type { PaymentMethod, PaymentStatus } from '@/types/hotel'
import SectionZone from '@/components/admin/SectionZone'
import PaymentsClient, { type PaymentRowData } from './PaymentsClient'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

interface RawPayment {
  id: string
  reservation_id: string | null
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  paid_at: string | null
  notes: string | null
  created_at: string
  received_by: string | null
  reservations: {
    reservation_code: string
    guests: { first_name: string; last_name: string } | null
  } | null
  profiles: { full_name: string } | null
}

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) + ' UZS'
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Money page — admin + accountant only.
  const role = (user.user_metadata?.role as string | undefined) ?? ''
  if (!['admin', 'accountant'].includes(role)) redirect('/dashboard?blocked=1')

  const locale = await getLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const t = await getTranslations('payments')

  const { data: rawPayments } = await supabase
    .from('payments')
    .select(`
      id, reservation_id, amount, currency, method, status, paid_at, notes, created_at, received_by,
      reservations(reservation_code, guests(first_name, last_name)),
      profiles!payments_received_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (rawPayments ?? []) as unknown as RawPayment[]

  const payments: PaymentRowData[] = rows.map((p) => ({
    id: p.id,
    reservationCode: p.reservations?.reservation_code ?? null,
    reservationId: p.reservation_id,
    guestName: p.reservations?.guests
      ? `${p.reservations.guests.first_name} ${p.reservations.guests.last_name}`
      : null,
    amount: p.amount,
    method: p.method,
    status: p.status,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    receivedByName: p.profiles?.full_name ?? null,
    notes: p.notes,
  }))

  const totalCompleted = rows
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingCount = rows.filter((p) => p.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('count', { n: rows.length })}</p>
      </div>

      {/* Summary cards */}
      <SectionZone tone="green" title={t('summaryTitle')} icon={<Wallet size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label={t('totalIncome')} value={formatUZS(totalCompleted)} accent="text-success" />
          <SummaryCard label={t('pendingPayment')} value={String(pendingCount)} accent="text-warning" />
          <SummaryCard label={t('totalCount')} value={String(rows.length)} accent="text-primary" />
        </div>
      </SectionZone>

      {/* Table — client component for row-click modal */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {payments.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CreditCard size={28} className="mx-auto mb-3 opacity-50" />
            <p>{t('empty')}</p>
          </div>
        ) : (
          <PaymentsClient payments={payments} dateLocale={dateLocale} />
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
