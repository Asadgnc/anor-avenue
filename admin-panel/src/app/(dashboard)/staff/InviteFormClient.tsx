'use client'

import { useActionState } from 'react'
import { inviteStaffAction, type StaffState } from './actions'

const ROLES = [
  { value: 'receptionist', label: 'Resepsiyon' },
  { value: 'manager',      label: 'Müdür' },
  { value: 'housekeeper',  label: 'Temizlik' },
  { value: 'accountant',   label: 'Muhasebeci' },
  { value: 'admin',        label: 'Admin' },
] as const

const init: StaffState = {}

export default function InviteFormClient() {
  const [state, action, pending] = useActionState<StaffState, FormData>(inviteStaffAction, init)

  const inputStyle = {
    backgroundColor: 'var(--color-admin-bg)',
    color: '#E8E8F0',
    borderColor: 'var(--color-admin-border)',
  }

  return (
    <form action={action} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
          Ad Soyad
        </label>
        <input
          name="fullName"
          type="text"
          placeholder="Ahmet Yılmaz"
          required
          className="px-3 py-2 rounded-lg text-sm border outline-none w-44"
          style={inputStyle}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
          E-posta adresi
        </label>
        <input
          name="email"
          type="email"
          placeholder="personel@ornek.com"
          required
          className="px-3 py-2 rounded-lg text-sm border outline-none w-56"
          style={{
            ...inputStyle,
            borderColor: state.error ? '#C62828' : 'var(--color-admin-border)',
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-admin-muted)' }}>
          Rol
        </label>
        <select
          name="role"
          defaultValue="receptionist"
          className="px-3 py-2 rounded-lg text-sm border outline-none appearance-none"
          style={inputStyle}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--color-accent)', color: '#0F0F1A' }}
      >
        {pending ? 'Gönderiliyor…' : state.success ? 'Davet gönderildi ✓' : 'Davet Gönder'}
      </button>
      {state.error && (
        <span className="text-xs" style={{ color: '#FCA5A5' }}>{state.error}</span>
      )}
    </form>
  )
}
