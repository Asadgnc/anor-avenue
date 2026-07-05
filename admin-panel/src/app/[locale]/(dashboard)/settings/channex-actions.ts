'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { testConnection } from '@/lib/channex'
import { syncAll, syncRates } from '@/lib/channex-sync'

// Sadece admin/manager Channex ayarlarını değiştirebilir.
async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, reason: 'session' }
  const role = (user.user_metadata?.role as string | undefined) ?? 'receptionist'
  if (!['admin', 'manager'].includes(role)) return { ok: false as const, reason: 'forbidden' }
  return { ok: true as const }
}

export type ChannexActionState = { error?: string; success?: boolean; message?: string }

// ─── Varyant OTA fiyatı + aç/kapa ───────────────────────────────────────────

const variantsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    enabled: z.boolean(),
    otaPrice: z.union([z.coerce.number().positive(), z.null()]),
  }),
)

export async function saveVariantsAction(
  _prev: ChannexActionState,
  formData: FormData,
): Promise<ChannexActionState> {
  const t = await getTranslations('errors')
  const auth = await requireManager()
  if (!auth.ok) return { error: t(auth.reason === 'forbidden' ? 'forbidden' : 'sessionInvalid') }

  let payload: unknown
  try { payload = JSON.parse(String(formData.get('payload') ?? '[]')) } catch { return { error: t('invalidData') } }
  const parsed = variantsSchema.safeParse(payload)
  if (!parsed.success) return { error: t('invalidData') }

  const service = createServiceClient()
  for (const v of parsed.data) {
    const { error } = await service
      .from('channex_variants')
      .update({ enabled: v.enabled, ota_price: v.otaPrice })
      .eq('id', v.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/settings')
  // OTA fiyatlarını arka planda yeniden gönder (env yoksa no-op)
  const from = new Date().toISOString().slice(0, 10)
  const to = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  syncRates(from, to).catch((e) => console.error('[channex] rate sync failed:', e))
  return { success: true }
}

// ─── Bağlantı testi ─────────────────────────────────────────────────────────

export async function testChannexConnectionAction(
  _prev: ChannexActionState,
): Promise<ChannexActionState> {
  const t = await getTranslations('errors')
  const auth = await requireManager()
  if (!auth.ok) return { error: t(auth.reason === 'forbidden' ? 'forbidden' : 'sessionInvalid') }

  const res = await testConnection()
  if (!res.ok) return { error: res.error || `HTTP ${res.status}` }
  return { success: true, message: 'OK' }
}

// ─── Tam yeniden gönder ─────────────────────────────────────────────────────

export async function fullResyncAction(
  _prev: ChannexActionState,
): Promise<ChannexActionState> {
  const t = await getTranslations('errors')
  const auth = await requireManager()
  if (!auth.ok) return { error: t(auth.reason === 'forbidden' ? 'forbidden' : 'sessionInvalid') }

  const summary = await syncAll(365)
  if (!summary.configured) return { error: 'Channex API key yok' }
  if (!summary.ok) return { error: summary.error || 'sync failed' }

  const service = createServiceClient()
  await service.from('hotel_settings').update({ channex_last_sync: new Date().toISOString() }).eq('id', 1)
  revalidatePath('/settings')
  return {
    success: true,
    message: `${summary.availabilityPushed} müsaitlik + ${summary.ratesPushed} fiyat gönderildi`,
  }
}
