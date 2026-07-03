'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { deleteStaffAction } from './actions'

export default function DeleteStaffButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const t = useTranslations('staff')
  const tc = useTranslations('common')

  async function handle() {
    if (!confirm(t('deleteConfirm', { email }))) return
    setPending(true)
    const res = await deleteStaffAction(userId)
    setPending(false)
    if (res.error) {
      alert(res.error)
    } else {
      router.refresh()
    }
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="text-xs px-2 py-1 rounded-lg border transition-opacity hover:opacity-80 disabled:opacity-40"
      style={{ color: '#EF4444', borderColor: '#FDEAEA' }}
    >
      {pending ? '…' : tc('delete')}
    </button>
  )
}
