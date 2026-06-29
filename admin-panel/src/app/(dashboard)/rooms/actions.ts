'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

// ─── Oda Ekleme ───────────────────────────────────────────────────────────────

const addRoomSchema = z.object({
  roomNumber:  z.string().min(1, 'Oda numarası zorunlu'),
  floor:       z.coerce.number().int(),
  roomTypeId:  z.string().uuid('Oda tipi seçin'),
})

export type RoomFormState = { error?: string; success?: boolean }

export async function addRoomAction(
  _prev: RoomFormState,
  formData: FormData
): Promise<RoomFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = addRoomSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { roomNumber, floor, roomTypeId } = parsed.data
  const service = createServiceClient()

  const { error } = await service.from('rooms').insert({
    room_number: roomNumber,
    floor,
    room_type_id: roomTypeId,
    status: 'available',
    cleaning_status: 'clean',
    is_active: true,
  })

  if (error) {
    if (error.code === '23505') return { error: `"${roomNumber}" numaralı oda zaten mevcut.` }
    return { error: error.message }
  }

  revalidatePath('/rooms')
  revalidatePath('/reservations')
  return { success: true }
}

// ─── Oda Durumu Güncelleme ────────────────────────────────────────────────────

export async function updateRoomStatusAction(
  roomId: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const service = createServiceClient()
  const { error } = await service
    .from('rooms')
    .update({ status })
    .eq('id', roomId)

  if (error) return { error: error.message }

  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return {}
}

// ─── Temizlik Durumu Güncelleme ───────────────────────────────────────────────

export async function updateCleaningStatusAction(
  roomId: string,
  cleaningStatus: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const service = createServiceClient()
  const { error } = await service
    .from('rooms')
    .update({ cleaning_status: cleaningStatus })
    .eq('id', roomId)

  if (error) return { error: error.message }

  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return {}
}
