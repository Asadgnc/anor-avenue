import { createBrowserClient } from '@supabase/ssr'

// Tarayıcı tarafında session'ı otomatik okur (cookies) — Realtime için kullan
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
