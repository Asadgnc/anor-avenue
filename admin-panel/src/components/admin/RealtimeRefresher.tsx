'use client'

// Dashboard layout'una bir kez mount edilir.
// reservations + rooms tablolarını dinler; değişiklikte açık sayfayı yeniler.
// Akıllı yenileme kuralları:
//  - Sekme arka plandaysa hemen yenileme; kullanıcı sekmeye dönünce tek sefer yenile
//    (arka planda boşuna sunucu render'ı tetiklenmez).
//  - İlgisiz sayfada yenileme yapılmaz: rooms değişikliği yalnızca oda/temizlik/dashboard
//    ekranlarını ilgilendirir; reservations değişikliği finans-dışı operasyon ekranlarını.
//  - 1.5 sn debounce: art arda gelen değişiklikler tek yenilemeye katlanır.

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

// Hangi tablo değişikliği hangi sayfa öneklerini ilgilendirir?
// Anahtar: pathname'in locale sonrası ilk segmenti ('' = dashboard köküne eş).
const TABLE_PAGES: Record<string, string[]> = {
  reservations: [
    'dashboard',
    'reservations',
    'guests',
    'housekeeping',
    'registrations',
    'payments',
    'folio',
    'reports',
    'tax',
  ],
  rooms: ['dashboard', 'rooms', 'housekeeping', 'reservations'],
}

function firstSegment(pathname: string): string {
  // /ru/reservations/list → 'reservations' (ilk parça locale)
  const parts = pathname.split('/').filter(Boolean)
  return parts[1] ?? 'dashboard'
}

export default function RealtimeRefresher() {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWhileHiddenRef = useRef(false)
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    function scheduleRefresh() {
      if (document.hidden) {
        // Sekme görünür olunca tek sefer yenilenecek
        pendingWhileHiddenRef.current = true
        return
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        router.refresh()
      }, 1500)
    }

    function onTableChange(table: 'reservations' | 'rooms') {
      const segment = firstSegment(pathnameRef.current)
      if (!TABLE_PAGES[table].includes(segment)) return
      scheduleRefresh()
    }

    function onVisibilityChange() {
      if (!document.hidden && pendingWhileHiddenRef.current) {
        pendingWhileHiddenRef.current = false
        router.refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => onTableChange('reservations')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => onTableChange('rooms')
      )
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
