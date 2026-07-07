import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import RoomsManager from '@/components/admin/RoomsManager'
import type { Room, RoomType } from '@/types/hotel'

export default async function RoomsPage() {
  const t = await getTranslations('rooms')
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')
  if (!['admin', 'receptionist'].includes(auth.role)) redirect('/dashboard?blocked=1')

  const role = auth.role || 'receptionist'

  const [roomsResult, typesResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, floor, status, cleaning_status, is_active, notes, room_type_id, room_types(name, base_price)')
      .eq('is_active', true)
      .order('floor')
      .order('room_number'),
    supabase
      .from('room_types')
      .select('id, name, description, base_price, max_occupancy')
      .order('base_price'),
  ])

  const rooms = (roomsResult.data ?? []) as unknown as Room[]
  const roomTypes = (typesResult.data ?? []) as unknown as RoomType[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
          {t('subtitle', { n: rooms.length })}
        </p>
      </div>

      <RoomsManager rooms={rooms} roomTypes={roomTypes} role={role} />
    </div>
  )
}
