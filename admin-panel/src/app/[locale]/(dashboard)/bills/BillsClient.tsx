'use client'

import { useState, useActionState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle2, Clock, AlertTriangle, Plus, X, ChevronDown, ChevronUp, Power } from 'lucide-react'
import { addBillAction, markBillPaidAction, toggleBillAction, type AddBillState, type MarkPaidState } from './actions'

const LOCALE_BCP47: Record<string, string> = {
  ru: 'ru-RU',
  uz: 'uz-UZ',
  'uz-cyrl': 'uz-Cyrl-UZ',
}

export interface BillWithStatus {
  id: string
  name: string
  category: string
  estimated_amount: number | null
  currency: string
  due_day: number
  is_active: boolean
  notes: string | null
  status: 'pending' | 'paid' | 'overdue'
  dueDateStr: string
  payment: { id: string; amount: number; paid_date: string | null; profiles: { full_name: string } | null } | null
}

export interface BillHistoryRow {
  id: string
  due_date: string
  paid_date: string | null
  amount: number
  currency: string
  notes: string | null
  recurring_bills: { name: string } | null
  profiles: { full_name: string } | null
}

interface Props {
  bills: BillWithStatus[]
  history: BillHistoryRow[]
  role: string
  selectedMonth: string
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  paid: <CheckCircle2 size={15} className="text-green-600" />,
  pending: <Clock size={15} className="text-amber-500" />,
  overdue: <AlertTriangle size={15} className="text-red-500" />,
}

function fmt(n: number) { return n.toLocaleString('uz-UZ') }

function MarkPaidForm({ bill, onDone }: { bill: BillWithStatus; onDone: () => void }) {
  const t = useTranslations('bills')
  const tc = useTranslations('common')
  const locale = useLocale()
  const som = locale === 'uz' ? "so'm" : locale === 'uz-cyrl' ? 'сўм' : 'сум'

  const boundAction = markBillPaidAction.bind(null, bill.id, bill.dueDateStr)
  const [state, action, isPending] = useActionState<MarkPaidState, FormData>(boundAction, {})

  useEffect(() => {
    if (state.success) onDone()
  }, [state.success, onDone])

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-card ring-1 ring-foreground/10 focus:ring-primary focus:outline-none text-foreground'

  return (
    <form action={action} className="flex flex-wrap gap-3 items-end p-4 bg-muted/20 rounded-b-lg border-t border-border">
      <div className="w-40">
        <label className="block text-xs mb-1 text-muted-foreground">{t('fields.amount')}</label>
        <input
          name="amount"
          type="number"
          step="any"
          min="1"
          defaultValue={bill.estimated_amount ?? ''}
          required
          disabled={isPending}
          className={inputCls}
          placeholder={`UZS (${som})`}
        />
      </div>
      <div className="flex-1 min-w-32">
        <label className="block text-xs mb-1 text-muted-foreground">{t('fields.notes')}</label>
        <input name="notes" type="text" disabled={isPending} className={inputCls} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? '…' : tc('save')}
      </button>
      <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-sm text-muted-foreground bg-card ring-1 ring-foreground/10 hover:ring-foreground/20">
        {t('cancelBtn')}
      </button>
      {state.error && <p className="w-full text-xs text-destructive mt-1">{state.error}</p>}
    </form>
  )
}

function AddBillForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('bills')
  const tc = useTranslations('common')
  const [state, action, isPending] = useActionState<AddBillState, FormData>(addBillAction, {})

  useEffect(() => {
    if (state.success) onDone()
  }, [state.success, onDone])

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-background ring-1 ring-foreground/10 focus:ring-primary focus:outline-none text-foreground'
  const labelCls = 'block text-xs mb-1 text-muted-foreground'

  const catKeys = ['utility', 'rent', 'salary', 'subscription', 'other'] as const

  return (
    <form action={action} className="p-5 space-y-4 bg-card rounded-xl ring-1 ring-foreground/10">
      <h3 className="text-sm font-semibold text-foreground">{t('addBillTitle')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t('fields.name')} *</label>
          <input name="name" required maxLength={100} disabled={isPending} className={inputCls} placeholder="Elektr, Gaz, Internet…" />
        </div>
        <div>
          <label className={labelCls}>{t('fields.category')}</label>
          <select name="category" disabled={isPending} className={inputCls}>
            {catKeys.map(k => <option key={k} value={k}>{t(`categories.${k}`)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('fields.estimatedAmount')}</label>
          <input name="estimated_amount" type="number" step="any" min="1" disabled={isPending} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('fields.dueDay')}</label>
          <input name="due_day" type="number" min="1" max="28" required disabled={isPending} className={inputCls} placeholder="1–28" />
        </div>
        <div>
          <label className={labelCls}>{t('fields.currency')}</label>
          <select name="currency" disabled={isPending} className={inputCls}>
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('fields.notes')}</label>
          <input name="notes" type="text" maxLength={500} disabled={isPending} className={inputCls} />
        </div>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {isPending ? '…' : tc('save')}
        </button>
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-sm text-muted-foreground bg-muted hover:bg-muted/80">
          {t('cancelBtn')}
        </button>
      </div>
    </form>
  )
}

export default function BillsClient({ bills, history, role, selectedMonth }: Props) {
  const t = useTranslations('bills')
  const locale = useLocale()
  const dateLocale = LOCALE_BCP47[locale] ?? 'ru-RU'
  const som = locale === 'uz' ? "so'm" : locale === 'uz-cyrl' ? 'сўм' : 'сум'
  const fmtSom = (n: number) => `${fmt(n)} ${som}`

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const canEdit = ['admin', 'manager', 'accountant'].includes(role)
  const canMarkPaid = ['admin', 'manager', 'accountant', 'receptionist'].includes(role)

  const now = new Date()
  const [year, mo] = selectedMonth.split('-').map(Number)
  const monthLabel = new Date(year, mo - 1, 1).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' })

  function fmtDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
  }

  async function handleToggle(bill: BillWithStatus) {
    await toggleBillAction(bill.id, !bill.is_active)
  }

  const statusLabel: Record<string, string> = {
    paid: t('statuses.paid'),
    pending: t('statuses.pending'),
    overdue: t('statuses.overdue'),
  }

  const statusBg: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 ring-green-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    overdue: 'bg-red-50 text-red-700 ring-red-200',
  }

  const summary = {
    paid: bills.filter(b => b.status === 'paid').length,
    pending: bills.filter(b => b.status === 'pending').length,
    overdue: bills.filter(b => b.status === 'overdue').length,
    total: bills.reduce((s, b) => s + (b.estimated_amount ?? 0), 0),
    paidTotal: bills.filter(b => b.status === 'paid').reduce((s, b) => s + (b.payment?.amount ?? b.estimated_amount ?? 0), 0),
  }

  return (
    <div className="space-y-8">
      {/* Header + month selector */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            name="month"
            type="month"
            defaultValue={selectedMonth}
            className="px-3 py-1.5 rounded-lg text-sm text-foreground bg-card ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90">
            →
          </button>
        </form>
      </div>

      {/* Summary strip */}
      {bills.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('statuses.paid')}</p>
            <p className="text-xl font-bold text-green-700">{summary.paid}</p>
          </div>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('statuses.pending')}</p>
            <p className="text-xl font-bold text-amber-600">{summary.pending}</p>
          </div>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('statuses.overdue')}</p>
            <p className="text-xl font-bold text-red-600">{summary.overdue}</p>
          </div>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('paidTotal')}</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{fmtSom(summary.paidTotal)}</p>
          </div>
        </div>
      )}

      {/* Current month bills */}
      <section>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('currentMonth')}</p>
        {bills.length === 0 ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
            {canEdit && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                {t('addBill')} →
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
            {bills.map((bill, idx) => (
              <div key={bill.id} className={idx > 0 ? 'border-t border-border' : ''}>
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="shrink-0">{STATUS_ICON[bill.status]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{bill.name}</span>
                      <span className="text-xs text-muted-foreground">{t(`categories.${bill.category}` as Parameters<typeof t>[0])}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {t('dueDate', { date: fmtDate(bill.dueDateStr) })}
                      </span>
                      {bill.estimated_amount && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          ~{fmtSom(bill.estimated_amount)}
                        </span>
                      )}
                      {bill.status === 'paid' && bill.payment && (
                        <span className="text-xs text-green-600 tabular-nums">
                          {fmtSom(bill.payment.amount)} · {bill.payment.profiles?.full_name ?? '—'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${statusBg[bill.status]}`}>
                    {statusLabel[bill.status]}
                  </span>
                  {canMarkPaid && bill.status !== 'paid' && (
                    <button
                      onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:opacity-90 flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} />
                      {t('markPaid')}
                      {expandedId === bill.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleToggle(bill)}
                      title={bill.is_active ? 'Deactivate' : 'Activate'}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Power size={14} />
                    </button>
                  )}
                </div>
                {expandedId === bill.id && (
                  <MarkPaidForm
                    bill={bill}
                    onDone={() => setExpandedId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add bill form */}
      {canEdit && (
        <section>
          {showAddForm ? (
            <AddBillForm onDone={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 ring-1 ring-primary/20 transition-colors"
            >
              <Plus size={16} />
              {t('addBill')}
            </button>
          )}
        </section>
      )}

      {/* Payment history */}
      {history.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('history')}</p>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('historyDate')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('historyBill')}</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('historyAmount')}</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('historyPaidBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map(row => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {row.paid_date ? fmtDate(row.paid_date) : fmtDate(row.due_date)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.recurring_bills?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{fmtSom(row.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.profiles?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
