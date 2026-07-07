// Web Push gönderimi — SADECE sunucuda çalışır (service_role kullanır).
// VAPID env değişkenleri yoksa tüm çağrılar sessiz no-op (panel push'suz da çalışır).

import webpush from 'web-push'
import { createServiceClient } from './supabase'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configure(): void {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:agence9117@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

async function sendToSubscriptions(rows: SubscriptionRow[], payload: PushPayload): Promise<number> {
  configure()
  const service = createServiceClient()
  const body = JSON.stringify(payload)
  let sent = 0

  await Promise.allSettled(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
        sent += 1
      } catch (e) {
        // 404/410 = abonelik ölmüş (uygulama silinmiş vb.) → kaydı temizle
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await service.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('[push] send failed:', status, sub.endpoint.slice(0, 48))
        }
      }
    })
  )
  return sent
}

/** Belirli rollerdeki TÜM personele bildirim gönderir. */
export async function sendPushToRoles(roles: string[], payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0
  const service = createServiceClient()

  const { data: profiles } = await service.from('profiles').select('id').in('role', roles)
  const userIds = (profiles ?? []).map((p: { id: string }) => p.id)
  if (userIds.length === 0) return 0

  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (!subs?.length) return 0

  return sendToSubscriptions(subs as SubscriptionRow[], payload)
}

/** Tek bir kullanıcıya bildirim gönderir (test için). */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0
  const service = createServiceClient()
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (!subs?.length) return 0
  return sendToSubscriptions(subs as SubscriptionRow[], payload)
}
