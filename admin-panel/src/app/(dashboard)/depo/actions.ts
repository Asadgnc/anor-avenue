'use server'

import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const purchaseSchema = z.object({
  category: z.enum(['cleaning', 'kitchen', 'food', 'beverage', 'decoration', 'room_furniture', 'replacement']),
  area: z.enum(['general', 'rooms', 'garden']).default('general'),
  product_name: z.string().min(1, 'Ürün adı zorunlu'),
  quantity: z.coerce.number().positive('Miktar 0\'dan büyük olmalı'),
  unit_price: z.coerce.number().nonnegative().optional(),
  total_amount: z.coerce.number().positive('Toplam tutar zorunlu'),
  currency: z.enum(['UZS', 'USD']),
  place: z.string().min(1, 'Alım yeri zorunlu'),
  brought_by_name: z.string().optional(),
})

export async function addPurchaseAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum geçersiz.' }

  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const d = parsed.data
  const service = createServiceClient()

  const { error } = await service.from('inventory_purchases').insert({
    category: d.category,
    area: d.area,
    product_name: d.product_name,
    quantity: d.quantity,
    unit_price: d.unit_price ?? null,
    total_amount: d.total_amount,
    currency: d.currency,
    place: d.place,
    entered_by: user.id,
    brought_by_name: d.brought_by_name || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/depo')
  revalidatePath('/garden')
  revalidatePath('/finance')
  return { success: true }
}
