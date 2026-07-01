import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewGuestFormClient from './NewGuestFormClient'

export default async function NewGuestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link
          href="/guests"
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}
        >
          ← Misafirler
        </Link>
        <h1 className="text-2xl font-semibold text-[#15112B]">Yeni Misafir</h1>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-admin-card)', boxShadow: 'var(--shadow-card)' }}>
        <NewGuestFormClient />
      </div>
    </div>
  )
}
