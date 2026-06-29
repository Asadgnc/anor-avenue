'use client'

import { useActionState } from 'react'
import { createRegistrationAction } from '@/app/(dashboard)/registrations/actions'

interface Props {
  guestId: string
  reservationId: string
}

export default function CreateRegistrationForm({ guestId, reservationId }: Props) {
  const [state, action, isPending] = useActionState(createRegistrationAction, {})

  if (state.success) {
    return (
      <p className="text-sm" style={{ color: '#86EFAC' }}>
        ✓ Kayıt oluşturuldu. <a href="/registrations" style={{ color: 'var(--color-accent)' }}>Kayıt listesine git →</a>
      </p>
    )
  }

  return (
    <form action={action} className="flex items-center gap-3 flex-wrap">
      <input type="hidden" name="guest_id" value={guestId} />
      <input type="hidden" name="reservation_id" value={reservationId} />
      {state.error && (
        <p className="text-xs w-full" style={{ color: '#FCA5A5' }}>{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: '#1E3A5F', color: '#93C5FD', border: '1px solid #2D5A8E' }}
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
