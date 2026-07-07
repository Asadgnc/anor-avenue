'use server'

// Push aboneliği kaydet/sil — mutasyon olduğu için sunucu-doğrulamalı auth (getUser).

import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { sendPushToUser, isPushConfigured } from '@/lib/push'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(512).optional(),
})

export async function savePushSubscriptionAction(input: {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const parsed = subscriptionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid' }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.userAgent ?? null,
    },
    { onConflict: 'endpoint' }
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function removePushSubscriptionAction(
  endpoint: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return { ok: true }
}

// Kendi cihazına test bildirimi (abonelik kurulumunu doğrulamak için)
export async function sendTestPushAction(): Promise<{ ok: boolean; sent: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isPushConfigured()) return { ok: false, sent: 0 }

  const sent = await sendPushToUser(user.id, {
    title: 'Anor Avenue',
    body: 'Test ✓',
    url: '/dashboard',
  })
  return { ok: sent > 0, sent }
}
