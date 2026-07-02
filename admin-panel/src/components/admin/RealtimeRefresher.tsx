'use client'

// Dashboard layout'una bir kez mount edilir.
// reservations ve rooms tablolarını dinler;
// değişiklik olunca tüm açık sayfa server component'larını yeniler.

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

export default function RealtimeRefresher() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        router.refresh()
      }, 500)
    }

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
