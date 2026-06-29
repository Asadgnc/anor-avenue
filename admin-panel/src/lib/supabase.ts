import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — client is NOT created at module load time,
// only on first access. This prevents build-time crashes when
// env vars are absent during Next.js static analysis.
let _client: SupabaseClient | undefined

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    const value = (_client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(_client) : value
  },
})

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
