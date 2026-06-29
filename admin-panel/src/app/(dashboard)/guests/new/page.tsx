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
          style={{ color: 'var(--color-admin-muted)', backgroundColor: 'var(--color-admin-card)', border: '1px solid var(--color-admin-border)' }}
        >
          ← Misafirler
        </Link>
        <h1 className="text-2xl font-semibold text-[#E8E8F0]">Yeni Misafir</h1>
      </div>

      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--color-admin-card)', borderColor: 'var(--color-admin-border)' }}>
        <NewGuestFormClient />
      </div>
    </div>
  )
}
