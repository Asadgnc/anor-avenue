'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { inviteStaffAction, type StaffState } from './actions'

const ROLE_VALUES = ['receptionist', 'housekeeper', 'accountant', 'admin'] as const

const init: StaffState = {}

export default function InviteFormClient() {
  const [state, action, pending] = useActionState<StaffState, FormData>(inviteStaffAction, init)
  const t = useTranslations('staff.inviteForm')
  const tRoles = useTranslations('roles')

  const inputStyle = {
    backgroundColor: 'var(--color-admin-card)',
    color: 'var(--foreground)',
    borderColor: 'var(--color-admin-border)',
  }

  return (
    <form action={action} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
          {t('nameLabel')}
        </label>
        <input
          name="fullName"
          type="text"
          placeholder={t('namePlaceholder')}
          required
          className="px-3 py-2 rounded-lg text-sm border outline-none w-44"
          style={inputStyle}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
          {t('emailLabel')}
        </label>
        <input
          name="email"
          type="email"
          placeholder={t('emailPlaceholder')}
          required
          className="px-3 py-2 rounded-lg text-sm border outline-none w-56"
          style={{
            ...inputStyle,
            borderColor: state.error ? '#EF4444' : 'var(--color-admin-border)',
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
          {t('roleLabel')}
        </label>
        <select
          name="role"
          defaultValue="receptionist"
          className="px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
          style={inputStyle}
        >
          {ROLE_VALUES.map((r) => (
            <option key={r} value={r}>{tRoles(r)}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
      >
        {pending ? t('sendingButton') : state.success ? t('sentButton') : t('sendButton')}
      </button>
      {state.error && (
        <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>
      )}
    </form>
  )
}
