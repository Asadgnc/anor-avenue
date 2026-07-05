// Channex (channel manager) REST istemcisi — SADECE sunucu tarafı.
// API anahtarı yalnızca env'de; asla client'a sızmaz.
//
// Env:
//   CHANNEX_API_KEY       — user-api-key header değeri
//   CHANNEX_BASE_URL      — https://staging.channex.io/api/v1 (deneme) veya
//                           https://secure.channex.io/api/v1 (canlı)
//   CHANNEX_WEBHOOK_SECRET — webhook doğrulaması için paylaşılan gizli anahtar
//
// Env yoksa istemci "yapılandırılmamış" sayılır → çağıranlar sessiz no-op yapar.

const BASE_URL = process.env.CHANNEX_BASE_URL || 'https://secure.channex.io/api/v1'
const API_KEY = process.env.CHANNEX_API_KEY

export function isChannexConfigured(): boolean {
  return Boolean(API_KEY)
}

export interface AvailabilityValue {
  property_id: string
  room_type_id: string
  date_from: string   // YYYY-MM-DD
  date_to: string     // YYYY-MM-DD
  availability: number
}

export interface RateValue {
  property_id: string
  rate_plan_id: string
  date_from: string
  date_to: string
  rate: number
}

export interface ChannexResult<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

async function request<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ChannexResult<T>> {
  if (!API_KEY) {
    return { ok: false, status: 0, error: 'Channex yapılandırılmamış (CHANNEX_API_KEY yok)' }
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': API_KEY,
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    })
    const text = await res.text()
    let data: unknown = undefined
    try { data = text ? JSON.parse(text) : undefined } catch { data = text }
    if (!res.ok) {
      const errMsg =
        (data as { errors?: { title?: string } })?.errors?.title ||
        (typeof data === 'string' ? data : `HTTP ${res.status}`)
      return { ok: false, status: res.status, error: errMsg, data: data as T }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'network error' }
  }
}

/** Müsaitlik (boş oda adedi) push — POST /availability */
export function pushAvailability(values: AvailabilityValue[]): Promise<ChannexResult> {
  if (values.length === 0) return Promise.resolve({ ok: true, status: 200 })
  return request('/availability', { method: 'POST', body: JSON.stringify({ values }) })
}

/** Fiyat/kısıtlama push — POST /restrictions */
export function pushRates(values: RateValue[]): Promise<ChannexResult> {
  if (values.length === 0) return Promise.resolve({ ok: true, status: 200 })
  return request('/restrictions', { method: 'POST', body: JSON.stringify({ values }) })
}

/** Bağlantı testi — properties listesi çekmeye çalışır */
export function testConnection(): Promise<ChannexResult> {
  return request('/properties', { method: 'GET' })
}

// ─── Booking pull ───────────────────────────────────────────────────────────

export interface ChannexBookingRoom {
  room_type_id: string
  rate_plan_id: string
  checkin_date: string
  checkout_date: string
  amount?: string | number
  occupancy?: { adults?: number; children?: number }
}

export interface ChannexBooking {
  id: string
  status: string                 // 'new' | 'modified' | 'cancelled'
  ota_name?: string
  ota_reservation_code?: string
  arrival_date?: string
  departure_date?: string
  currency?: string
  amount?: string | number
  customer?: {
    name?: string
    surname?: string
    mail?: string
    phone?: string
    country?: string
  }
  rooms?: ChannexBookingRoom[]
}

/**
 * Webhook'tan gelen booking_id ile tam rezervasyonu çeker.
 * GET /bookings/:id  → { data: { attributes } }
 */
export async function getBooking(bookingId: string): Promise<ChannexResult<ChannexBooking>> {
  const res = await request<{ data?: { id: string; attributes: Record<string, unknown> } }>(
    `/bookings/${bookingId}`,
    { method: 'GET' },
  )
  if (!res.ok || !res.data?.data) return { ...res, data: undefined }
  const attr = res.data.data.attributes as unknown as ChannexBooking
  return { ok: true, status: res.status, data: { ...attr, id: res.data.data.id } }
}
