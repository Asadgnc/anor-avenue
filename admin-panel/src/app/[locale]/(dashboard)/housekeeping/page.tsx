import { createClient } from '@/lib/supabase-server'
import { getAuthClaims } from '@/lib/auth-claims'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import HousekeepingBoard from '@/components/admin/HousekeepingBoard'
import type { Room } from '@/types/hotel'

interface HousekeepingTask {
  id: string
  room_id: string
  task_type: string
  status: string
  priority: number
  notes: string | null
  due_date: string | null
  completed_at: string | null
  assigned_to: string | null
  profiles: { full_name: string } | null
}

export default async function HousekeepingPage() {
  const supabase = await createClient()
  const auth = await getAuthClaims()
  if (!auth) redirect('/login')

  const role = auth.role || 'receptionist'
  const t = await getTranslations('housekeeping')

  const [roomsResult, tasksResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, room_number, floor, status, cleaning_status, is_active, notes, room_type_id, room_types(name, base_price)')
      .eq('is_active', true)
      .order('floor')
      .order('room_number'),
    supabase
      .from('housekeeping_tasks')
      .select('id, room_id, task_type, status, priority, notes, due_date, completed_at, assigned_to, profiles(full_name)')
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date'),
  ])

  const rooms = (roomsResult.data ?? []) as unknown as Room[]
  const tasks = (tasksResult.data ?? []) as unknown as HousekeepingTask[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-admin-muted)' }}>
          {t('subtitle', { rooms: rooms.length, tasks: tasks.length })}
        </p>
      </div>

      <HousekeepingBoard rooms={rooms} tasks={tasks} role={role} />
    </div>
  )
}
