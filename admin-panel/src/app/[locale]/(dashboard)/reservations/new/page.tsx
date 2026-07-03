import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import NewReservationForm from '@/components/admin/NewReservationForm'
import type { Room } from '@/types/hotel'
import { dash } from '@/lib/dashboardTheme'

export default async function NewReservationPage() {
  const t = await getTranslations('reservations.new')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('rooms')
    .select('id, room_number, floor, status, cleaning_status, is_active, notes, room_type_id, room_types(name, base_price)')
    .eq('is_active', true)
    .order('floor')
    .order('room_number')

  const rooms = (data ?? []) as unknown as Room[]

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <Link
          href="/reservations"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-admin-muted)' }}
        >
          {t('backLink')}
        </Link>
        <span style={{ color: 'var(--color-admin-border)' }}>/</span>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      </div>

      {rooms.length === 0 && (
        <div
          className="rounded-xl border px-5 py-4 text-sm"
          style={{ backgroundColor: dash.orangeLight, borderColor: dash.orange, color: dash.orange }}
        >
          {t('noRoomsWarning')}
        </div>
      )}

      <NewReservationForm rooms={rooms} />
    </div>
  )
}
