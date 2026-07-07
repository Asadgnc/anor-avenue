import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import AccountingTabs from '@/components/admin/AccountingTabs'
import BillsClient, { type BillWithStatus, type BillHistoryRow } from './BillsClient'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  // Bills are part of accounting — admin + accountant only.
  const role = auth.role
  if (!['admin', 'accountant'].includes(role)) {
    redirect('/dashboard?blocked=1')
  }

  const params = await searchParams
  const today = new Date()
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const selectedMonth = params.month ?? currentMonthStr
  const [year, mo] = selectedMonth.split('-').map(Number)

  const monthStart = `${selectedMonth}-01`
  // Use last day of month for the upper bound
  const lastDay = new Date(year, mo, 0).getDate()
  const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`

  const [billsResult, paymentsResult, historyResult] = await Promise.all([
    supabase
      .from('recurring_bills')
      .select('id, name, category, estimated_amount, currency, due_day, is_active, notes')
      .eq('is_active', true)
      .order('due_day'),
    supabase
      .from('bill_payments')
      .select('id, bill_id, due_date, paid_date, amount, currency, status, notes, profiles(full_name)')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd),
    supabase
      .from('bill_payments')
      .select('id, due_date, paid_date, amount, currency, notes, period_start, period_end, fiscal_url, recurring_bills(name), profiles(full_name)')
      .eq('status', 'paid')
      .gte('due_date', toDateStr(new Date(today.getFullYear(), today.getMonth() - 3, 1)))
      .order('due_date', { ascending: false })
      .limit(60),
  ])

  const rawBills = (billsResult.data ?? []) as Array<{
    id: string
    name: string
    category: string
    estimated_amount: number | null
    currency: string
    due_day: number
    is_active: boolean
    notes: string | null
  }>

  type RawPayment = {
    id: string
    bill_id: string
    due_date: string
    paid_date: string | null
    amount: number
    currency: string
    status: string
    notes: string | null
    profiles: { full_name: string } | null
  }

  const monthPayments = (paymentsResult.data ?? []) as unknown as RawPayment[]

  const todayStr = toDateStr(today)

  const bills: BillWithStatus[] = rawBills.map((bill) => {
    const day = Math.min(bill.due_day, lastDay)
    const dueDateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
    const payment = monthPayments.find((p) => p.bill_id === bill.id) ?? null

    let status: 'pending' | 'paid' | 'overdue'
    if (payment?.status === 'paid') {
      status = 'paid'
    } else if (dueDateStr < todayStr) {
      status = 'overdue'
    } else {
      status = 'pending'
    }

    return {
      id: bill.id,
      name: bill.name,
      category: bill.category,
      estimated_amount: bill.estimated_amount,
      currency: bill.currency,
      due_day: bill.due_day,
      notes: bill.notes,
      is_active: bill.is_active,
      status,
      dueDateStr,
      payment: payment
        ? {
            id: payment.id,
            amount: payment.amount,
            paid_date: payment.paid_date,
            profiles: payment.profiles,
          }
        : null,
    }
  })

  const history = (historyResult.data ?? []) as unknown as BillHistoryRow[]

  return (
    <div className="space-y-6">
      <AccountingTabs />
      <BillsClient
        bills={bills}
        history={history}
        role={role}
        selectedMonth={selectedMonth}
      />
    </div>
  )
}
