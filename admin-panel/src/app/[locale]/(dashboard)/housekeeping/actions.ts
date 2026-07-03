'use server'

import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

const cleaningStatusSchema = z.enum(['clean', 'dirty', 'in_progress', 'cleaned', 'inspected'])

// Housekeeper may only transition to these target statuses
const HOUSEKEEPER_ALLOWED_TARGETS = new Set(['in_progress', 'cleaned'])

// Roles allowed to perform inspections
const INSPECTION_ROLES = new Set(['admin', 'manager', 'receptionist'])

export async function updateCleaningStatus(roomId: string, newStatus: string) {
  const validatedStatus = cleaningStatusSchema.parse(newStatus)
  const validatedRoomId = z.string().uuid().parse(roomId)

  const supabase = await createClient()
  const t = await getTranslations('errors')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error(t('sessionInvalid'))

  const role = (user.user_metadata?.role as string | undefined) ?? 'receptionist'

  // Role restriction — enforce server-side
  if (role === 'housekeeper' && !HOUSEKEEPER_ALLOWED_TARGETS.has(validatedStatus)) {
    throw new Error(t('permissionDenied'))
  }

  const service = createServiceClient()
  const { error } = await service
    .from('rooms')
    .update({ cleaning_status: validatedStatus })
    .eq('id', validatedRoomId)

  if (error) throw new Error(error.message)

  revalidatePath('/housekeeping')
  revalidatePath('/dashboard')
}

export async function submitRoomInspectionAction(data: {
  roomId: string
  reservationId?: string
  allOk: boolean
  problemNote?: string
  damageOk: boolean
  damageNote?: string
  missingItems: Array<{ item_id: string; name: string; note?: string }>
}) {
  const supabase = await createClient()
  const t = await getTranslations('errors')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error(t('sessionInvalid'))

  // Only authorized roles may perform inspections
  const role = (user.user_metadata?.role as string | undefined) ?? 'receptionist'
  if (!INSPECTION_ROLES.has(role)) {
    throw new Error(t('permissionDenied'))
  }

  const schema = z.object({
    roomId: z.string().uuid(),
    reservationId: z.string().uuid().optional(),
    allOk: z.boolean(),
    problemNote: z.string().optional(),
    damageOk: z.boolean(),
    damageNote: z.string().optional(),
    missingItems: z.array(z.object({
      item_id: z.string(),
      name: z.string(),
      note: z.string().optional(),
    })),
  })
  const validated = schema.parse(data)

  const service = createServiceClient()

  // 1. Insert the inspection record
  const { error: inspectError } = await service.from('room_inspections').insert({
    room_id: validated.roomId,
    reservation_id: validated.reservationId ?? null,
    inspected_by: user.id,
    all_ok: validated.allOk,
    problem_note: validated.problemNote ?? null,
    damage_ok: validated.damageOk,
    damage_note: validated.damageNote ?? null,
    missing_items: validated.missingItems,
  })
  if (inspectError) throw new Error(inspectError.message)

  // 2. After inspection is approved, room status becomes 'clean'
  const { error: roomError } = await service
    .from('rooms')
    .update({ cleaning_status: 'clean' })
    .eq('id', validated.roomId)
  if (roomError) throw new Error(roomError.message)

  revalidatePath(`/housekeeping/${validated.roomId}`)
  revalidatePath('/housekeeping')
  revalidatePath('/dashboard')
}
