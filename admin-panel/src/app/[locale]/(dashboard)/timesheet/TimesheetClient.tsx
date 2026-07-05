'use client'

import { useActionState, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check, X, Clock } from 'lucide-react'
import { upsertShiftAction, deleteShiftAction, type ShiftState } from './actions'

export interface StaffMember {
  id: string
  full_name: string
  role: string
}

export interface ShiftRow {
  id: string
  profile_id: string
  shift_date: string
  status: 'present' | 'absent' | 'sick' | 'leave' | 'holiday'
  start_time: string | null
  end_time: string | null
  break_min: number
  notes: string | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  present:  { bg: '#D1FAE5', color: '#065F46' },
  absent:   { bg: '#FEE2E2', color: '#991B1B' },
  sick:     { bg: '#FEF3C7', color: '#92400E' },
  leave:    { bg: '#DBEAFE', color: '#1E40AF' },
  holiday:  { bg: '#EDE9FE', color: '#5B21B6' },
}

function workedHours(shift: ShiftRow): string {
  if (!shift.start_time || !shift.end_time) return '—'
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  const total = (eh * 60 + em) - (sh * 60 + sm) - (shift.break_min ?? 0)
  if (total <= 0) return '—'
  const h = Math.floor(total / 60)
  const m = total % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function ShiftForm({
  staff,
  existing,
  onClose,
}: {
  staff: StaffMember
  existing: ShiftRow | null
  onClose: () => void
}) {
  const t = useTranslations('timesheet')
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(existing?.shift_date ?? today)
  const [state, action, pending] = useActionState<ShiftState, FormData>(
    (prev, fd) => upsertShiftAction(prev, fd),
    {}
  )

  return (
    <form
      action={action}
      className="space-y-3 p-4 rounded-2xl"
      style={{ backgroundColor: 'var(--color-admin-bg)', border: '1px solid var(--color-admin-border)' }}
    >
      <input type="hidden" name="profile_id" value={staff.id} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{staff.full_name}</p>
        <button type="button" onClick={onClose} className="hover:text-red-500 transition-colors" style={{ color: 'var(--color-admin-muted)' }}>
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.date')}</label>
          <input
            name="shift_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.status')}</label>
          <select
            name="status"
            defaultValue={existing?.status ?? 'present'}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          >
            {(['present','absent','sick','leave','holiday'] as const).map((s) => (
              <option key={s} value={s}>{t(`statuses.${s}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.startTime')}</label>
          <input
            name="start_time"
            type="time"
            defaultValue={existing?.start_time ?? '09:00'}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.endTime')}</label>
          <input
            name="end_time"
            type="time"
            defaultValue={existing?.end_time ?? '18:00'}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.breakMin')}</label>
          <input
            name="break_min"
            type="number"
            min={0}
            max={480}
            defaultValue={existing?.break_min ?? 0}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)] tabular-nums"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-admin-muted)' }}>{t('fields.notes')}</label>
          <input
            name="notes"
            type="text"
            defaultValue={existing?.notes ?? ''}
            maxLength={300}
            className="w-full rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            style={{ backgroundColor: 'white', border: '1px solid var(--color-admin-border)', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <Check size={13} />
          {pending ? t('saving') : t('save')}
        </button>
        {state.success && <span className="text-xs text-green-600 self-center">{t('saved')}</span>}
      </div>
    </form>
  )
}

export default function TimesheetClient({
  staff,
  shifts,
  canWrite,
  weekStart,
}: {
  staff: StaffMember[]
  shifts: ShiftRow[]
  canWrite: boolean
  weekStart: string
}) {
  const t = useTranslations('timesheet')
  const [formFor, setFormFor] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Build date columns: 7 days from weekStart
  const days: string[] = []
  const base = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }

  function getShift(profileId: string, date: string): ShiftRow | undefined {
    return shifts.find((s) => s.profile_id === profileId && s.shift_date === date)
  }

  function handleDelete(shiftId: string) {
    startTransition(async () => {
      await deleteShiftAction(shiftId)
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {/* Week nav built into the page via GET form */}
      <div className="overflow-x-auto rounded-2xl" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-admin-border)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-admin-muted)', minWidth: 140 }}>
                {t('staffColumn')}
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  className="px-3 py-3 text-center text-xs font-semibold"
                  style={{
                    color: d === today ? 'var(--color-accent)' : 'var(--color-admin-muted)',
                    minWidth: 90,
                    backgroundColor: d === today ? 'var(--bg-gold-soft, #FEF9EE)' : undefined,
                  }}
                >
                  {new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-admin-border)' }} className="hover:bg-black/[0.02] transition-colors">
                <td className="px-4 py-2">
                  <p className="font-medium text-foreground text-sm">{s.full_name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-admin-muted)' }}>{s.role}</p>
                </td>
                {days.map((d) => {
                  const shift = getShift(s.id, d)
                  const sc = shift ? STATUS_COLORS[shift.status] : null
                  return (
                    <td key={d} className="px-2 py-2 text-center align-middle" style={{ backgroundColor: d === today ? 'var(--bg-gold-soft, #FEF9EE)' : undefined }}>
                      {shift ? (
                        <div className="space-y-0.5">
                          <span
                            className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: sc?.bg, color: sc?.color }}
                          >
                            {t(`statuses.${shift.status}`)}
                          </span>
                          {shift.start_time && (
                            <p className="text-[10px] flex items-center justify-center gap-0.5" style={{ color: 'var(--color-admin-muted)' }}>
                              <Clock size={9} />
                              {workedHours(shift)}
                            </p>
                          )}
                          {canWrite && (
                            <div className="flex gap-1 justify-center mt-0.5">
                              <button
                                onClick={() => setFormFor(`${s.id}__${d}`)}
                                className="text-[10px] hover:underline"
                                style={{ color: 'var(--color-accent)' }}
                              >
                                {t('edit')}
                              </button>
                              <span style={{ color: 'var(--color-admin-muted)' }}>·</span>
                              <button
                                onClick={() => handleDelete(shift.id)}
                                className="text-[10px] hover:text-red-500 transition-colors"
                                style={{ color: 'var(--color-admin-muted)' }}
                              >
                                {t('delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : canWrite ? (
                        <button
                          onClick={() => setFormFor(`${s.id}__${d}`)}
                          className="text-[11px] hover:underline opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          + {t('add')}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-admin-muted)' }}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline form */}
      {formFor && (() => {
        const [profileId, shiftDate] = formFor.split('__')
        const member = staff.find((s) => s.id === profileId)
        if (!member) return null
        const existing = getShift(profileId, shiftDate) ?? null
        return (
          <ShiftForm
            key={formFor}
            staff={member}
            existing={existing}
            onClose={() => setFormFor(null)}
          />
        )
      })()}
    </div>
  )
}
