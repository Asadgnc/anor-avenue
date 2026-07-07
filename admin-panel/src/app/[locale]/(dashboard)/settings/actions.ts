'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase'
import { requireRole } from '@/lib/require-role'
import { syncRates, triggerAvailabilitySync } from '@/lib/channex-sync'

// ─── Update room type price ────────────────────────────────────────────────
// Single price entry point: the panel takes one 2-person base price per type.
// Extra person = +150,000. Channex occupancy variants are derived as
// base + (occ-2)*150000 and pushed automatically. Guest-site reads room_types.

const EXTRA_PERSON_FEE = 150000
const BASE_OCCUPANCY = 2

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
  const auth = await requireRole('admin')
  if (!auth.ok) return { error: auth.error }

  const parsed = priceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: t('pricePositive') }

  const service = createServiceClient()
  const { error } = await service
    .from('room_types')
    .update({ base_price: parsed.data.basePrice })
    .eq('id', parsed.data.roomTypeId)

  if (error) return { error: error.message }

  // Update this type's Channex variants (matched by label prefix) via the +150k rule
  const { data: rt } = await service
    .from('room_types')
    .select('name')
    .eq('id', parsed.data.roomTypeId)
    .single()
  if (rt?.name) {
    const { data: variants } = await service
      .from('channex_variants')
      .select('id, occupancy')
      .ilike('label', `${rt.name}%`)
    for (const v of variants ?? []) {
      const price =
        parsed.data.basePrice + Math.max(0, v.occupancy - BASE_OCCUPANCY) * EXTRA_PERSON_FEE
      await service.from('channex_variants').update({ ota_price: price }).eq('id', v.id)
    }
  }

  revalidatePath('/settings')
  revalidatePath('/rooms')

  // Push rates + availability to Channex (silent no-op without env).
  // Awaited: when "Save" completes the price has reached Channex (not fire-and-forget).
  const from = new Date().toISOString().slice(0, 10)
  const to = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  try {
    const rateResult = await syncRates(from, to)
    if (rateResult.error) console.error('[channex] rate sync failed:', rateResult.error)
  } catch (e) {
    console.error('[channex] rate sync failed:', e)
  }
  await triggerAvailabilitySync()

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
  const auth = await requireRole('admin')
  if (!auth.ok) return { error: auth.error }

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

// ─── Update finance settings (USD rate + tourist tax) ──────────────────────
// Money settings — admin only. Used by the accounting module for UZS conversion
// and tourist-tax auto-calculation.

const financeSettingsSchema = z.object({
  usd_rate:              z.coerce.number().positive(),
  tourist_tax_per_night: z.coerce.number().min(0),
})

export type FinanceSettingsState = { error?: string; success?: boolean }

export async function updateFinanceSettingsAction(
  _prev: FinanceSettingsState,
  formData: FormData
): Promise<FinanceSettingsState> {
  const t = await getTranslations('errors')
  const auth = await requireRole('admin')
  if (!auth.ok) return { error: auth.error }

  const parsed = financeSettingsSchema.safeParse(Object.fromEntries(formData))
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
