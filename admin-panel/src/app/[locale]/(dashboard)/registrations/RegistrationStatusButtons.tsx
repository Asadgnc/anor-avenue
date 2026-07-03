'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { updateRegistrationStatusAction } from './actions'
import { dash } from '@/lib/dashboardTheme'

interface Props {
  id: string
  currentStatus: string
}

const NEXT_STATUS: Record<string, { labelKey: 'markSubmitted' | 'markConfirmed'; value: 'pending' | 'submitted' | 'confirmed'; color: string } | undefined> = {
  pending:   { labelKey: 'markSubmitted', value: 'submitted', color: dash.blue },
  submitted: { labelKey: 'markConfirmed', value: 'confirmed', color: dash.green },
}

export default function RegistrationStatusButtons({ id, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const t = useTranslations('registrations.buttons')
  const tc = useTranslations('common')
  const next = NEXT_STATUS[currentStatus]

  if (!next) return null

  function handleClick() {
    startTransition(async () => {
      const result = await updateRegistrationStatusAction(id, next!.value)
      if (result.error) alert(`${tc('error')}: ${result.error}`)
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
      {isPending ? '...' : t(next.labelKey)}
    </button>
  )
}
