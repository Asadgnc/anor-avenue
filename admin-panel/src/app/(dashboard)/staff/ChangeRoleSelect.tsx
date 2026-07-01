'use client'

import { useActionState } from 'react'
import { changeRoleAction, type StaffState } from './actions'

const ROLES = [
  { value: 'admin',        label: 'Admin' },
  { value: 'manager',      label: 'Müdür' },
  { value: 'receptionist', label: 'Resepsiyon' },
  { value: 'housekeeper',  label: 'Temizlik' },
  { value: 'accountant',   label: 'Muhasebeci' },
] as const

type Props = {
  userId: string
  currentRole: string
}

const init: StaffState = {}

export default function ChangeRoleSelect({ userId, currentRole }: Props) {
  const [state, action, pending] = useActionState<StaffState, FormData>(changeRoleAction, init)

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
          color: '#15112B',
          borderColor: state.error ? '#EF4444' : 'var(--color-admin-border)',
        }}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: 'var(--color-admin-bg)', color: 'var(--color-accent)', border: '1px solid var(--color-admin-border)' }}
      >
        {pending ? '…' : state.success ? '✓' : 'Kaydet'}
      </button>
      {state.error && (
        <span className="text-xs" style={{ color: '#EF4444' }}>{state.error}</span>
      )}
    </form>
  )
}
