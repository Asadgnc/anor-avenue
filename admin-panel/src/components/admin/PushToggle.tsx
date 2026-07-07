'use client'

// Bildirim aç/kapat düğmesi (topbar).
// Açınca: bildirim izni → service worker push aboneliği → DB'ye kayıt → test bildirimi.
// Service worker yalnızca production build'de kayıtlıdır; dev'de düğme gizli kalır.

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BellRing, BellOff } from 'lucide-react'
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushAction,
} from '@/app/actions/push'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PushState = 'unavailable' | 'off' | 'on' | 'busy'

export default function PushToggle() {
  const t = useTranslations('push')
  const [state, setState] = useState<PushState>('unavailable')

  useEffect(() => {
    let cancelled = false
    async function detect() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        return
      }
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return // dev modunda SW yok
      const sub = await registration.pushManager.getSubscription()
      if (!cancelled) setState(sub ? 'on' : 'off')
    }
    detect().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    setState('busy')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert(t('denied'))
        setState('off')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      const json = sub.toJSON()
      const result = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        userAgent: navigator.userAgent,
      })
      if (!result.ok) throw new Error(result.error)
      setState('on')
      await sendTestPushAction()
    } catch (e) {
      console.error('[push] subscribe failed:', e)
      setState('off')
    }
  }

  async function disable() {
    setState('busy')
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setState('on')
    }
  }

  if (state === 'unavailable') return null

  const on = state === 'on'
  return (
    <button
      onClick={on ? disable : enable}
      disabled={state === 'busy'}
      title={on ? t('disable') : t('enable')}
      aria-label={on ? t('disable') : t('enable')}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center ring-1 transition-shadow duration-150 disabled:opacity-50 ${
        on
          ? 'bg-primary text-primary-foreground ring-primary/40'
          : 'bg-card text-muted-foreground ring-foreground/10 hover:ring-foreground/20'
      }`}
    >
      {on ? <BellRing size={15} /> : <BellOff size={15} />}
    </button>
  )
}
