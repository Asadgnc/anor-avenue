'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

// ─── Update room type price ────────────────────────────────────────────────

const priceSchema = z.object({
  roomTypeId: z.string().uuid(),
  basePrice:  z.coerce.number().positive(),
})

export type PriceState = { error?: string; success?: boolean }

export async function updateRoomTypePriceAction(
  _prev: PriceState,
  formData: FormData
): Promise<PriceState> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  const parsed = priceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('pricePositive') }

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

// ─── Update hotel profile ──────────────────────────────────────────────────

const hotelProfileSchema = z.object({
  hotel_name:    z.string().min(1),
  address:       z.string().default(''),
  phone:         z.string().default(''),
  email:         z.string().email().or(z.literal('')).default(''),
  website:       z.string().url().or(z.literal('')).default(''),
  checkin_time:  z.string().regex(/^\d{2}:\d{2}$/),
  checkout_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export type HotelProfileState = { error?: string; success?: boolean }

export async function updateHotelProfileAction(
  _prev: HotelProfileState,
  formData: FormData
): Promise<HotelProfileState> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  const parsed = hotelProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('invalidData') }

  const service = createServiceClient()
  const { error } = await service
    .from('hotel_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
