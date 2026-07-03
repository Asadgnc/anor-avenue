'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateRegistrationStatusAction } from './actions'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  id: string
  currentStatus: string
}

const NEXT_STATUS: Record<string, { label: string; value: 'pending' | 'submitted' | 'confirmed'; color: string } | undefined> = {
  pending:   { label: 'Bildirimi Gönderildi İşaretle', value: 'submitted', color: dash.blue },
  submitted: { label: 'Onaylandı İşaretle', value: 'confirmed', color: dash.green },
}

export default function RegistrationStatusButtons({ id, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const next = NEXT_STATUS[currentStatus]

  if (!next) return null

  function handleClick() {
    startTransition(async () => {
      const result = await updateRegistrationStatusAction(id, next!.value)
      if (result.error) alert('Hata: ' + result.error)
      else router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{ backgroundColor: next.color, color: '#FFFFFF' }}
    >
      {isPending ? '...' : next.label}
    </button>
  )
}
