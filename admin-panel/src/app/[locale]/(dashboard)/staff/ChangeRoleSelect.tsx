'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { changeRoleAction, type StaffState } from './actions'

const ROLE_VALUES = ['admin', 'manager', 'receptionist', 'housekeeper', 'accountant'] as const

type Props = {
  userId: string
  currentRole: string
}

const init: StaffState = {}

export default function ChangeRoleSelect({ userId, currentRole }: Props) {
  const [state, action, pending] = useActionState<StaffState, FormData>(changeRoleAction, init)
  const tRoles = useTranslations('roles')
  const tc = useTranslations('common')

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        disabled={pending}
        className="px-2 py-1 rounded text-xs border outline-none appearance-none"
        style={{
          backgroundColor: 'var(--color-admin-card)',
          color: 'var(--foreground)',
          borderColor: state.error ? '#EF4444' : 'var(--color-admin-border)',
        }}
      >
        {ROLE_VALUES.map((r) => (
          <option key={r} value={r}>{tRoles(r)}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-accent)', border: '1px solid var(--color-admin-border)' }}
      >
        {pending ? '…' : state.success ? '✓' : tc('save')}
      </button>
      {state.error && (
        <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>
      )}
    </form>
  )
}
