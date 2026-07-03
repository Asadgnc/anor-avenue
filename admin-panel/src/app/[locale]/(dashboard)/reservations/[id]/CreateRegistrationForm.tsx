'use client'

import { useActionState } from 'react'
import { createRegistrationAction } from '@/app/[locale]/(dashboard)/registrations/actions'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  guestId: string
  reservationId: string
}

export default function CreateRegistrationForm({ guestId, reservationId }: Props) {
  const [state, action, isPending] = useActionState(createRegistrationAction, {})

  if (state.success) {
    return (
      <p className="text-sm" style={{ color: dash.green }}>
        ✓ Kayıt oluşturuldu. <a href="/registrations" style={{ color: 'var(--color-accent)' }}>Kayıt listesine git →</a>
      </p>
    )
  }

  return (
    <form action={action} className="flex items-center gap-3 flex-wrap">
      <input type="hidden" name="guest_id" value={guestId} />
      <input type="hidden" name="reservation_id" value={reservationId} />
      {state.error && (
        <p className="text-xs w-full" style={{ color: dash.red }}>{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: dash.blueLight, color: dash.blue, border: `1px solid ${dash.blue}` }}
      >
        {isPending ? 'Oluşturuluyor…' : '+ Registratsiya Kaydı Aç'}
      </button>
      <a
        href="/registrations"
        className="text-xs"
        style={{ color: 'var(--color-admin-muted)' }}
      >
        Kayıt listesine git →
      </a>
    </form>
  )
}
