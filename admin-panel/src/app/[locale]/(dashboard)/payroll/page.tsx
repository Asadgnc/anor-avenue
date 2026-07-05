import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import PayrollClient, { type PayrollPeriod, type PayrollItem, type StaffOption } from './PayrollClient'

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const locale = await getLocale()
    redirect(`/${locale}/login`)
  }

  const role = (user.user_metadata?.role as string) ?? 'receptionist'
  if (!['admin', 'manager', 'accountant'].includes(role)) {
    redirect('/dashboard?blocked=1')
  }

  const t = await getTranslations('payroll')
  const canWrite = ['admin', 'manager'].includes(role)

  const [periodsResult, itemsResult, staffResult] = await Promise.all([
    supabase
      .from('payroll_periods')
      .select('id, year, month, status, notes, created_at')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(12),
    supabase
      .from('payroll_items')
      .select('id, period_id, profile_id, base_salary, bonus, deduction, net_amount, currency, notes, profiles(full_name, role)')
      .order('created_at'),
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name'),
  ])

  const periods = (periodsResult.data ?? []) as unknown as PayrollPeriod[]
  const items = (itemsResult.data ?? []) as unknown as PayrollItem[]
  const staff = (staffResult.data ?? []) as unknown as StaffOption[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {t('subtitle', { n: periods.length })}
          </p>
        </div>
        <Link
          href="/timesheet"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)', color: 'var(--color-admin-muted)' }}
        >
          {t('timesheetLink')}
        </Link>
      </div>

      <PayrollClient
        periods={periods}
        items={items}
        staff={staff}
        canWrite={canWrite}
      />
    </div>
  )
}
