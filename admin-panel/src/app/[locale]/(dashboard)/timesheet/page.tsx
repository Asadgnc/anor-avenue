import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import TimesheetClient, { type StaffMember, type ShiftRow } from './TimesheetClient'

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const locale = await getLocale()
    redirect(`/${locale}/login`)
  }

  const role = (user.user_metadata?.role as string) ?? ''
  if (!['admin', 'accountant'].includes(role)) {
    redirect('/dashboard?blocked=1')
  }

  const t = await getTranslations('timesheet')
  const params = await searchParams
  const weekStart = getWeekStart(params.week)
  const weekEnd = addDays(weekStart, 6)
  const prevWeek = addDays(weekStart, -7)
  const nextWeek = addDays(weekStart, 7)

  const [staffResult, shiftsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name'),
    supabase
      .from('staff_shifts')
      .select('id, profile_id, shift_date, status, start_time, end_time, break_min, notes')
      .gte('shift_date', weekStart)
      .lte('shift_date', weekEnd)
      .order('shift_date'),
  ])

  const staff = (staffResult.data ?? []) as unknown as StaffMember[]
  const shifts = (shiftsResult.data ?? []) as unknown as ShiftRow[]
  const canWrite = role === 'admin'

  // Summary: count by status for the week
  const presentCount = shifts.filter((s) => s.status === 'present').length
  const absentCount = shifts.filter((s) => s.status === 'absent').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {t('subtitle', { present: presentCount, absent: absentCount })}
          </p>
        </div>
        <Link
          href="/payroll"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)', color: 'var(--color-admin-muted)' }}
        >
          {t('payrollLink')}
        </Link>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Link
          href={`/timesheet?week=${prevWeek}`}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)', color: 'var(--foreground)' }}
        >
          ← {t('prevWeek')}
        </Link>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {weekStart} — {weekEnd}
        </span>
        <Link
          href={`/timesheet?week=${nextWeek}`}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)', color: 'var(--foreground)' }}
        >
          {t('nextWeek')} →
        </Link>
        <Link
          href="/timesheet"
          className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)', color: 'var(--color-admin-muted)' }}
        >
          {t('thisWeek')}
        </Link>
      </div>

      <TimesheetClient
        staff={staff}
        shifts={shifts}
        canWrite={canWrite}
        weekStart={weekStart}
      />
    </div>
  )
}
