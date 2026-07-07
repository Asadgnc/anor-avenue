// Channex senkron mantığı — SADECE sunucu tarafı.
// Model: her Channex "oda tipi" bir VARYANT (doluluk); her varyant belirli fiziksel
// odalara bağlı (rooms.channex_variant_id). Müsaitlik = varyanta bağlı boş oda sayısı.
// Env yoksa sessiz no-op.

import { createServiceClient } from '@/lib/supabase'
import {
  isChannexConfigured,
  pushAvailability,
  pushRates,
  type AvailabilityValue,
  type RateValue,
} from '@/lib/channex'

const DAY_MS = 86400000
const ACTIVE_RES = ['pending', 'confirmed', 'checked_in'] as const
const UNSELLABLE_ROOM = ['maintenance', 'blocked']

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(iso: string, n: number): string {
  return toISO(new Date(new Date(iso).getTime() + n * DAY_MS))
}
function today(): string {
  return toISO(new Date())
}

export interface SyncSummary {
  configured: boolean
  ok: boolean
  availabilityPushed: number
  ratesPushed: number
  error?: string
}

interface Variant {
  id: string
  channex_room_type_id: string
  channex_rate_plan_id: string
  ota_price: number | null
  enabled: boolean
}

async function loadContext() {
  const service = createServiceClient()
  const { data: hotel } = await service
    .from('hotel_settings')
    .select('channex_property_id')
    .eq('id', 1)
    .single()
  const propertyId: string | null = hotel?.channex_property_id ?? null

  // Disabled varyantlar da yüklenir: müsaitlikleri 0 olarak push edilir ki
  // OTA'da kalan eski müsaitlik satışa devam etmesin (bkz. syncAvailability).
  const { data: variantRows } = await service
    .from('channex_variants')
    .select('id, channex_room_type_id, channex_rate_plan_id, ota_price, enabled')
  const variants = (variantRows ?? []) as Variant[]

  return { service, propertyId, variants }
}

/** [from, to) aralığı için varyant başına müsaitlik (boş oda adedi) push eder. */
export async function syncAvailability(
  from: string,
  to: string,
): Promise<{ pushed: number; error?: string }> {
  if (!isChannexConfigured()) return { pushed: 0 }
  const { service, propertyId, variants } = await loadContext()
  if (!propertyId) return { pushed: 0, error: 'channex_property_id ayarlı değil' }
  if (variants.length === 0) return { pushed: 0 }

  // Odalar → varyant + kapasite
  const { data: rooms } = await service
    .from('rooms')
    .select('id, channex_variant_id, status, is_active')
    .not('channex_variant_id', 'is', null)

  const roomToVariant = new Map<string, string>()
  const capacity = new Map<string, number>()  // variantId -> satılabilir oda sayısı
  for (const room of rooms ?? []) {
    if (!room.channex_variant_id) continue
    roomToVariant.set(room.id, room.channex_variant_id)
    if (room.is_active && !UNSELLABLE_ROOM.includes(room.status)) {
      capacity.set(room.channex_variant_id, (capacity.get(room.channex_variant_id) ?? 0) + 1)
    }
  }

  // Çakışan aktif rezervasyonlar
  const { data: reservations } = await service
    .from('reservations')
    .select('room_id, check_in, check_out')
    .in('status', ACTIVE_RES as unknown as string[])
    .lt('check_in', to)
    .gt('check_out', from)

  const occupied = new Map<string, Map<string, number>>() // variantId -> (date -> count)
  for (const v of variants) occupied.set(v.id, new Map())
  for (const res of reservations ?? []) {
    const variantId = roomToVariant.get(res.room_id)
    if (!variantId) continue
    const dayMap = occupied.get(variantId)
    if (!dayMap) continue
    let d = res.check_in < from ? from : res.check_in
    const end = res.check_out > to ? to : res.check_out
    while (d < end) {
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
      d = addDays(d, 1)
    }
  }

  // Gün başına müsaitlik → eşit ardışık günleri aralığa grupla
  const values: AvailabilityValue[] = []
  for (const v of variants) {
    // enabled=false → OTA'da satışa kapalı: her gün için 0 push edilir.
    const cap = v.enabled ? (capacity.get(v.id) ?? 0) : 0
    const dayMap = occupied.get(v.id) ?? new Map<string, number>()
    let runStart: string | null = null
    let runVal = -1
    let d = from
    while (d < to) {
      const avail = Math.max(0, cap - (dayMap.get(d) ?? 0))
      if (avail !== runVal) {
        if (runStart !== null) {
          values.push({
            property_id: propertyId,
            room_type_id: v.channex_room_type_id,
            date_from: runStart,
            date_to: addDays(d, -1),
            availability: runVal,
          })
        }
        runStart = d
        runVal = avail
      }
      d = addDays(d, 1)
    }
    if (runStart !== null) {
      values.push({
        property_id: propertyId,
        room_type_id: v.channex_room_type_id,
        date_from: runStart,
        date_to: addDays(to, -1),
        availability: runVal,
      })
    }
  }

  const res = await pushAvailability(values)
  return { pushed: values.length, error: res.ok ? undefined : res.error }
}

/** [from, to) aralığı için varyant OTA fiyatlarını rate_plan'lara push eder (düz fiyat). */
export async function syncRates(
  from: string,
  to: string,
): Promise<{ pushed: number; error?: string }> {
  if (!isChannexConfigured()) return { pushed: 0 }
  const { propertyId, variants } = await loadContext()
  if (!propertyId) return { pushed: 0, error: 'channex_property_id ayarlı değil' }

  const values: RateValue[] = []
  for (const v of variants) {
    if (!v.enabled) continue  // satışa kapalı varyanta fiyat push edilmez
    if (v.ota_price == null || Number(v.ota_price) <= 0) continue  // fiyat girilmemiş → atla
    values.push({
      property_id: propertyId,
      rate_plan_id: v.channex_rate_plan_id,
      date_from: from,
      date_to: addDays(to, -1),
      rate: Math.round(Number(v.ota_price)),
    })
  }

  const res = await pushRates(values)
  return { pushed: values.length, error: res.ok ? undefined : res.error }
}

/** Yuvarlanan pencere için müsaitlik + fiyat tam senkron (cron + "Tam yeniden gönder"). */
export async function syncAll(days = 365): Promise<SyncSummary> {
  if (!isChannexConfigured()) {
    return { configured: false, ok: false, availabilityPushed: 0, ratesPushed: 0 }
  }
  const from = today()
  const to = addDays(from, days)
  const [avail, rates] = await Promise.all([syncAvailability(from, to), syncRates(from, to)])
  const error = avail.error || rates.error
  return {
    configured: true,
    ok: !error,
    availabilityPushed: avail.pushed,
    ratesPushed: rates.pushed,
    error,
  }
}

/**
 * Rezervasyon mutasyonlarından çağrılır — müsaitliği yuvarlanan pencerede yeniden
 * gönderir. Hata UI'yi bloklamaz (yakalanır). Küçük otel → tüm varyantları gönderir.
 */
export async function triggerAvailabilitySync(days = 365): Promise<void> {
  if (!isChannexConfigured()) return
  try {
    const from = today()
    await syncAvailability(from, addDays(from, days))
  } catch (e) {
    console.error('[channex] availability sync failed:', e)
  }
}
