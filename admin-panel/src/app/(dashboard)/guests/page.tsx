import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import GuestListClient from './GuestListClient'
import type { Guest } from '@/types/hotel'

export default async function GuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: guests } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, phone, nationality, passport_number')
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = (guests ?? []) as Guest[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Misafirler</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {rows.length} kayıt
          </p>
        </div>
        <Link
          href="/guests/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          + Yeni Misafir
        </Link>
      </div>

      <GuestListClient guests={rows} />
    </div>
  )
}
