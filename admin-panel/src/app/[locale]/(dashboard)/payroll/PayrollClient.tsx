'use client'

import { useActionState, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import {
  createPeriodAction,
  upsertPayrollItemAction,
  updatePeriodStatusAction,
  type PeriodState,
  type ItemState,
} from './actions'

export interface PayrollPeriod {
  id: string
  year: number
  month: number
  status: 'draft' | 'finalized' | 'paid'
  notes: string | null
  created_at: string
}

export interface PayrollItem {
  id: string
  period_id: string
  profile_id: string
  base_salary: number
  bonus: number
  deduction: number
  net_amount: number
  currency: string
  notes: string | null
  profiles: { full_name: string; role: string } | null
}

export interface StaffOption {
  id: string
  full_name: string
  role: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#F3F4F6', color: '#374151' },
  finalized: { bg: '#DBEAFE', color: '#1E40AF' },
  paid:      { bg: '#D1FAE5', color: '#065F46' },
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(n) + ' ' + currency
}

function ItemRow({
  periodId,
  staff,
  existing,
  isEditable,
}: {
  periodId: string
  staff: StaffOption
  existing: PayrollItem | null
  isEditable: boolean
}) {
  const t = useTranslations('payroll')
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<ItemState, FormData>(
    (prev, fd) => upsertPayrollItemAction(prev, fd),
    {}
  )

  return (
    <div style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{staff.full_name}</p>
          <p className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{staff.role}</p>
        </div>
        <div className="flex items-center gap-4">
          {existing ? (
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                {fmt(existing.net_amount, existing.currency)}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-admin-muted)' }}>
                {fmt(existing.base_salary, existing.currency)} + {fmt(existing.bonus, existing.currency)} − {fmt(existing.deduction, existing.currency)}
              </p>
            </div>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-admin-muted)' }}>{t('notSet')}</span>
          )}
          {isEditable && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="p-1 rounded-lg transition-colors hover:bg-black/5"
              style={{ color: 'var(--color-admin-muted)' }}
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {open && isEditable && (
        <form
          action={action}
          className="px-4 pb-4 space-y-3"
        >
          <input type="hidden" name="period_id" value={periodId} />
          <input type="hidden" name="profile_id" value={staff.id} />

          <div className="grid grid-cols-2 gap-2">
            {(['base_salary', 'bonus', 'deduction'] as const).map((field) => (
              <div key={field}>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t(`fields.${field}`)}</label>
                <input
                  name={field}
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={existing?.[field] ?? 0}
                  className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)] tabular-nums"
                  style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
                />
              </div>
            ))}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.currency')}</label>
              <select
                name="currency"
                defaultValue={existing?.currency ?? 'UZS'}
                className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
              >
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <input
            name="notes"
            type="text"
            defaultValue={existing?.notes ?? ''}
            maxLength={300}
            placeholder={t('fields.notesPlaceholder')}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />

          {state.error && <p className="text-xs text-red-500">{state.error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              <Check size={13} />
              {pending ? t('saving') : t('save')}
            </button>
            {state.success && <span className="text-xs text-green-600">{t('saved')}</span>}
          </div>
        </form>
      )}
    </div>
  )
}

function PeriodCard({
  period,
  items,
  staff,
  canWrite,
}: {
  period: PayrollPeriod
  items: PayrollItem[]
  staff: StaffOption[]
  canWrite: boolean
}) {
  const t = useTranslations('payroll')
  const [, startTransition] = useTransition()
  const sc = STATUS_COLORS[period.status]
  const totalUzs = items.filter((i) => i.currency === 'UZS').reduce((s, i) => s + i.net_amount, 0)
  const totalUsd = items.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.net_amount, 0)
  const isEditable = canWrite && period.status !== 'paid'
  const monthName = new Date(period.year, period.month - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  function handleStatus(next: 'draft' | 'finalized' | 'paid') {
    startTransition(async () => {
      await updatePeriodStatusAction(period.id, next)
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
        <div>
          <p className="font-semibold text-foreground capitalize">{monthName}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-admin-muted)' }}>
            {totalUzs > 0 && fmt(totalUzs, 'UZS')}
            {totalUzs > 0 && totalUsd > 0 && ' · '}
            {totalUsd > 0 && fmt(totalUsd, 'USD')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>
            {t(`statuses.${period.status}`)}
          </span>
          {canWrite && period.status === 'draft' && (
            <button
              onClick={() => handleStatus('finalized')}
              className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-80 font-semibold"
              style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}
            >
              {t('finalize')}
            </button>
          )}
          {canWrite && period.status === 'finalized' && (
            <button
              onClick={() => handleStatus('paid')}
              className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-80 font-semibold"
              style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
            >
              {t('markPaid')}
            </button>
          )}
        </div>
      </div>

      {/* Staff rows */}
      <div>
        {staff.map((s) => (
          <ItemRow
            key={s.id}
            periodId={period.id}
            staff={s}
            existing={items.find((i) => i.profile_id === s.id) ?? null}
            isEditable={isEditable}
          />
        ))}
      </div>
    </div>
  )
}

function NewPeriodForm({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations('payroll')
  const [open, setOpen] = useState(false)
  const now = new Date()
  const [state, action, pending] = useActionState<PeriodState, FormData>(
    (prev, fd) => createPeriodAction(prev, fd),
    {}
  )

  if (!canWrite) return null

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
      >
        + {t('newPeriod')}
      </button>

      {open && (
        <form
          action={action}
          className="mt-3 p-4 rounded-2xl space-y-3"
          style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex gap-2">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.year')}</label>
              <input
                name="year"
                type="number"
                defaultValue={now.getFullYear()}
                min={2020}
                max={2100}
                className="w-24 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)] tabular-nums"
                style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.month')}</label>
              <select
                name="month"
                defaultValue={now.getMonth() + 1}
                className="rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleDateString('ru-RU', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input
            name="notes"
            type="text"
            placeholder={t('fields.notesPlaceholder')}
            maxLength={500}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />
          {state.error && (
            <p className="text-xs text-red-500">
              {state.error === 'duplicate' ? t('duplicateError') : state.error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {pending ? t('saving') : t('create')}
            </button>
            {state.success && <span className="text-xs text-green-600 self-center">{t('created')}</span>}
          </div>
        </form>
      )}
    </div>
  )
}

export default function PayrollClient({
  periods,
  items,
  staff,
  canWrite,
}: {
  periods: PayrollPeriod[]
  items: PayrollItem[]
  staff: StaffOption[]
  canWrite: boolean
}) {
  const t = useTranslations('payroll')

  return (
    <div className="space-y-4">
      <NewPeriodForm canWrite={canWrite} />

      {periods.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-admin-muted)' }}>{t('empty')}</p>
      )}

      {periods.map((p) => (
        <PeriodCard
          key={p.id}
          period={p}
          items={items.filter((i) => i.period_id === p.id)}
          staff={staff}
          canWrite={canWrite}
        />
      ))}
    </div>
  )
}
