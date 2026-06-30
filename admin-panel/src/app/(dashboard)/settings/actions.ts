'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

// ─── Oda Tipi Fiyat Güncelleme ────────────────────────────────────────────────

const priceSchema = z.object({
  roomTypeId: z.string().uuid(),
  basePrice:  z.coerce.number().positive('Fiyat 0\'dan büyük olmalı'),
})

export type PriceState = { error?: string; success?: boolean }

export async function updateRoomTypePriceAction(
  _prev: PriceState,
  formData: FormData
): Promise<PriceState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = priceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const service = createServiceClient()
  const { error } = await service
    .from('room_types')
    .update({ base_price: parsed.data.basePrice })
    .eq('id', parsed.data.roomTypeId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/rooms')
  return { success: true }
}

// ─── Otel Profili Güncelleme ──────────────────────────────────────────────────

const hotelProfileSchema = z.object({
  hotel_name:    z.string().min(1, 'Otel adı boş olamaz'),
  address:       z.string().default(''),
  phone:         z.string().default(''),
  email:         z.string().email('Geçersiz e-posta').or(z.literal('')).default(''),
  website:       z.string().url('Geçersiz URL').or(z.literal('')).default(''),
  checkin_time:  z.string().regex(/^\d{2}:\d{2}$/, 'Geçersiz saat'),
  checkout_time: z.string().regex(/^\d{2}:\d{2}$/, 'Geçersiz saat'),
})

export type HotelProfileState = { error?: string; success?: boolean }

export async function updateHotelProfileAction(
  _prev: HotelProfileState,
  formData: FormData
): Promise<HotelProfileState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = hotelProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const service = createServiceClient()
  const { error } = await service
    .from('hotel_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
