'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteStaffAction } from './actions'

export default function DeleteStaffButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handle() {
    if (!confirm(`"${email}" hesabını silmek istediğinize emin misiniz?`)) return
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
      style={{ color: '#FCA5A5', borderColor: '#450A0A' }}
    >
      {pending ? '…' : 'Sil'}
    </button>
  )
}
