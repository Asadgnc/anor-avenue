'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase'
import { requireRole } from '@/lib/require-role'
import { testConnection } from '@/lib/channex'
import { syncAll, syncRates, triggerAvailabilitySync } from '@/lib/channex-sync'

export type ChannexActionState = { error?: string; success?: boolean; message?: string }

// ─── Variant enable/disable (NOT price — price comes from room type settings) ─

const variantsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    enabled: z.boolean(),
  }),
)

export async function saveVariantsAction(
  _prev: ChannexActionState,
  formData: FormData,
): Promise<ChannexActionState> {
  const t = await getTranslations('errors')
  const auth = await requireRole('admin')
  if (!auth.ok) return { error: auth.error }

  let payload: unknown
  try { payload = JSON.parse(String(formData.get('payload') ?? '[]')) } catch { return { error: t('invalidData') } }
  const parsed = variantsSchema.safeParse(payload)
  if (!parsed.success) return { error: t('invalidData') }

  const service = createServiceClient()
  for (const v of parsed.data) {
    const { error } = await service
      .from('channex_variants')
      .update({ enabled: v.enabled })
      .eq('id', v.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/settings')

  // Re-push rates AND availability when variants are toggled (no-op without env).
  // Awaited: on Vercel a fire-and-forget promise is killed when the response
  // returns, so the push would often never reach Channex.
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

// ─── Connection test ─────────────────────────────────────────────────────────

export async function testChannexConnectionAction(
  _prev: ChannexActionState,
): Promise<ChannexActionState> {
  const auth = await requireRole('admin')
  if (!auth.ok) return { error: auth.error }

  const res = await testConnection()
  if (!res.ok) return { error: res.error || `HTTP ${res.status}` }
  return { success: true, message: 'OK' }
}

// ─── Full resync ─────────────────────────────────────────────────────────────

export async function fullResyncAction(
  _prev: ChannexActionState,
): Promise<ChannexActionState> {
  const auth = await requireRole('admin')
  if (!auth.ok) return { error: auth.error }

  const tc = await getTranslations('channex.connect')
  const summary = await syncAll(365)
  if (!summary.configured) return { error: tc('notConfigured') }
  if (!summary.ok) return { error: summary.error || 'sync failed' }

  const service = createServiceClient()
  await service.from('hotel_settings').update({ channex_last_sync: new Date().toISOString() }).eq('id', 1)
  revalidatePath('/settings')
  return {
    success: true,
    message: tc('resyncSummary', {
      availability: summary.availabilityPushed,
      rates: summary.ratesPushed,
    }),
  }
}
