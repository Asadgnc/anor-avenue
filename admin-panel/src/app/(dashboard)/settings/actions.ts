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
