import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { syncAvailability } from '@/lib/channex-sync'
import { sendPushToRoles } from '@/lib/push'

// Supabase Database Webhook alıcısı (catch-all senkron).
// reservations/rooms tablosunda HANGİ yoldan değişiklik olursa olsun
// (guest-site, admin, OTA webhook'u, elle SQL) DB trigger'ı bu endpoint'i çağırır →
// müsaitlik ~1-2 sn içinde Channex'e gider. Yanıt hemen döner (DB tarafı bloklanmaz),
// asıl iş `after()` ile yanıttan sonra çalışır.
//
// Trigger kurulumu: docs/migrations/027_db_webhook_channex.sql

// Aynı instance'a saniyede onlarca değişiklik gelirse tek push'a katlanır (best-effort;
// serverless instance başına ayrı sayaçtır, kesin teklik gerekmez — Channex idempotent).
let lastSyncStartedAt = 0

interface DbWebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE'
  table?: string
  record?: Record<string, unknown> | null
}

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_SYNC_SECRET
  if (!secret || request.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: DbWebhookPayload = {}
  try {
    payload = (await request.json()) as DbWebhookPayload
  } catch {
    /* boş gövde ok */
  }

  after(async () => {
    // Guest-site'tan yeni rezervasyon (pending + Channex kaynaklı değil) → resepsiyona push.
    // Admin'in kendi oluşturdukları confirmed/checked_in olduğundan buraya düşmez;
    // OTA rezervasyonları channex_booking_id taşır ve kendi webhook'unda bildirilir.
    if (payload.type === 'INSERT' && payload.table === 'reservations') {
      const r = payload.record ?? {}
      const isPending = r.status === 'pending'
      const fromChannex = Boolean(r.channex_booking_id)
      if (isPending && !fromChannex) {
        await sendPushToRoles(['admin', 'receptionist'], {
          title: 'Anor Avenue',
          body: `Новая бронь с сайта · ${String(r.check_in ?? '')} → ${String(r.check_out ?? '')}`,
          url: '/reservations/list?status=pending',
        }).catch((e) => console.error('[push] db-webhook notify failed:', e))
      }
    }

    const now = Date.now()
    if (now - lastSyncStartedAt < 2000) return
    lastSyncStartedAt = now

    const from = new Date().toISOString().slice(0, 10)
    const to = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    try {
      await syncAvailability(from, to)
    } catch (e) {
      console.error('[db-webhook] availability sync failed:', e)
    }
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
