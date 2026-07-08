import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import GuestListClient, { type GuestRow } from './GuestListClient'

export default async function GuestsPage() {
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')
  if (!['admin', 'receptionist'].includes(auth.role)) redirect('/dashboard?blocked=1')

  const t = await getTranslations('guests')

  // Fetch guests with ONLY their most recent reservation (last stay info) +
  // a server-side stay count — tüm rezervasyon/ödeme geçmişini çekmek yerine
  // misafir başına 1 satır döner (500 misafirde ~binlerce satır tasarrufu).
  const { data: guests } = await supabase
    .from('guests')
    .select(`
      id, first_name, last_name, nationality,
      stays:reservations(count),
      last:reservations(
        check_in, nights, total_amount,
        rooms(room_number),
        payments(amount, status)
      )
    `)
    .order('check_in', { ascending: false, referencedTable: 'last' })
    .limit(1, { referencedTable: 'last' })
    .order('created_at', { ascending: false })
    .limit(500)

  type RawGuest = {
    id: string
    first_name: string
    last_name: string
    nationality: string | null
    stays: Array<{ count: number }>
    last: Array<{
      check_in: string
      nights: number
      total_amount: number
      rooms: { room_number: string } | null
      payments: Array<{ amount: number; status: string }>
    }>
  }

  const rows: GuestRow[] = ((guests ?? []) as unknown as RawGuest[]).map((g) => {
    const last = g.last[0] ?? null
    const paid = last
      ? last.payments
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0)
      : 0

    return {
      id: g.id,
      first_name: g.first_name,
      last_name: g.last_name,
      nationality: g.nationality,
      lastRoom: last?.rooms?.room_number ?? null,
      lastNights: last?.nights ?? null,
      lastTotalAmount: last?.total_amount ?? null,
      lastPaid: last ? paid : null,
      stayCount: g.stays[0]?.count ?? 0,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
            {t('count', { n: rows.length })}
          </p>
        </div>
        <Link
          href="/guests/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}
        >
          {t('newButton')}
        </Link>
      </div>

      <GuestListClient guests={rows} />
    </div>
  )
}
