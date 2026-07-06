'use server'

import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import type { InventoryMovement } from '@/types/hotel'

// Roles allowed to consume stock
const CONSUME_ROLES = new Set(['admin', 'receptionist', 'housekeeper'])

const purchaseSchema = z.object({
  category: z.enum(['cleaning', 'kitchen', 'food', 'beverage', 'decoration', 'room_furniture', 'replacement']),
  area: z.enum(['general', 'rooms', 'garden', 'kitchen', 'reception']).default('general'),
  product_name: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().nonnegative().optional(),
  total_amount: z.coerce.number().positive(),
  currency: z.enum(['UZS', 'USD']),
  place: z.string().min(1),
  brought_by_name: z.string().optional(),
})

export async function addPurchaseAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations('errors')
  const tDepo = await getTranslations('depo')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('invalidData') }

  const d = parsed.data
  const service = createServiceClient()

  // 1. inventory_products: find by name or create
  const { data: existing } = await service
    .from('inventory_products')
    .select('id, on_hand')
    .ilike('name', d.product_name.trim())
    .eq('category', d.category)
    .maybeSingle()

  let productId: string

  if (existing) {
    // Existing product — increase stock
    const { error: updateErr } = await service
      .from('inventory_products')
      .update({ on_hand: Number(existing.on_hand) + d.quantity })
      .eq('id', existing.id)
    if (updateErr) return { error: updateErr.message }
    productId = existing.id
  } else {
    // Create new product
    const { data: newProduct, error: insertErr } = await service
      .from('inventory_products')
      .insert({ name: d.product_name.trim(), category: d.category, on_hand: d.quantity })
      .select('id')
      .single()
    if (insertErr || !newProduct) return { error: insertErr?.message ?? t('productCreateFailed') }
    productId = newProduct.id
  }

  // 2. Movement record (in)
  await service.from('inventory_movements').insert({
    product_id: productId,
    type: 'in',
    quantity: d.quantity,
    destination: 'general',
    moved_by: user.id,
    note: tDepo('purchaseNotePrefix', { place: d.place }),
  })

  // 3. inventory_purchases record (keeps finance feed intact)
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
    product_id: productId,
  })
  if (error) return { error: error.message }

  revalidatePath('/depo')
  revalidatePath('/garden')
  revalidatePath('/finance')
  return { success: true }
}

// ——— Consume stock (Use) ———
const consumeSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  destination: z.enum(['room', 'garden', 'kitchen', 'reception', 'general']),
  roomId: z.string().uuid().optional().or(z.literal('')),
  note: z.string().optional(),
})

export async function consumeStockAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  const role = (user.user_metadata?.role as string | undefined) ?? 'receptionist'
  if (!CONSUME_ROLES.has(role)) return { error: t('permissionDenied') }

  const parsed = consumeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('quantityPositive') }

  const d = parsed.data
  const service = createServiceClient()

  // Check current stock
  const { data: product } = await service
    .from('inventory_products')
    .select('on_hand')
    .eq('id', d.productId)
    .single()

  if (!product) return { error: t('productNotFound') }
  if (Number(product.on_hand) < d.quantity) {
    return { error: t('insufficientStock', { available: product.on_hand }) }
  }

  // Decrease stock
  const { error: updateErr } = await service
    .from('inventory_products')
    .update({ on_hand: Number(product.on_hand) - d.quantity })
    .eq('id', d.productId)
  if (updateErr) return { error: updateErr.message }

  // Movement record (out)
  await service.from('inventory_movements').insert({
    product_id: d.productId,
    type: 'out',
    quantity: d.quantity,
    destination: d.destination,
    room_id: (d.destination === 'room' && d.roomId) ? d.roomId : null,
    moved_by: user.id,
    note: d.note || null,
  })

  revalidatePath('/depo')
  return { success: true }
}

// ——— Product history (admin only) ———
export async function getProductMovementsAction(productId: string): Promise<{
  movements?: InventoryMovement[]
  error?: string
}> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t('sessionInvalid') }

  const role = (user.user_metadata?.role as string | undefined) ?? ''
  if (role !== 'admin') return { error: t('permissionDenied') }

  const service = createServiceClient()
  const { data, error } = await service
    .from('inventory_movements')
    .select('id, type, quantity, destination, room_id, moved_by, note, created_at, profiles(full_name), rooms(room_number)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { error: error.message }
  return { movements: (data ?? []) as unknown as InventoryMovement[] }
}
