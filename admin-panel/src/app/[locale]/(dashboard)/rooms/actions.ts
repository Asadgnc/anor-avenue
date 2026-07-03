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

// ─── Oda Düzenleme ───────────────────────────────────────────────────────────

const updateRoomSchema = z.object({
  roomNumber:  z.string().min(1, 'Oda numarası zorunlu'),
  floor:       z.coerce.number().int(),
  roomTypeId:  z.string().uuid('Oda tipi seçin'),
  notes:       z.string().optional(),
  isActive:    z.coerce.boolean().optional(),
})

export async function updateRoomAction(
  roomId: string,
  formData: FormData
): Promise<RoomFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const raw = Object.fromEntries(formData)
  const parsed = updateRoomSchema.safeParse({
    ...raw,
    isActive: formData.get('isActive') === 'true',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { roomNumber, floor, roomTypeId, notes, isActive } = parsed.data
  const service = createServiceClient()

  const { error } = await service
    .from('rooms')
    .update({
      room_number:   roomNumber,
      floor,
      room_type_id:  roomTypeId,
      notes:         notes || null,
      is_active:     isActive ?? true,
    })
    .eq('id', roomId)

  if (error) {
    if (error.code === '23505') return { error: `"${roomNumber}" numaralı oda zaten mevcut.` }
    return { error: error.message }
  }

  revalidatePath('/rooms')
  revalidatePath('/reservations')
  return { success: true }
}

// ─── Oda Eşyaları ────────────────────────────────────────────────────────────

export async function addRoomItemAction(
  roomId: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const schema = z.object({
    name: z.string().min(1, 'Eşya adı zorunlu'),
    expected_qty: z.coerce.number().int().min(1),
  })
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const service = createServiceClient()
  const { error } = await service.from('room_items').insert({
    room_id: roomId,
    name: parsed.data.name,
    expected_qty: parsed.data.expected_qty,
  })

  if (error) return { error: error.message }
  revalidatePath(`/rooms/${roomId}`)
  return { success: true }
}

export async function deleteRoomItemAction(
  itemId: string,
  roomId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const service = createServiceClient()
  const { error } = await service.from('room_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(`/rooms/${roomId}`)
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
