import { createClient } from './supabase-server'

export interface AuthClaims {
  userId: string
  email: string
  role: string
  fullName: string
}

// Middleware her istekte auth.getUser() ile oturumu ağ üzerinden zaten doğruluyor.
// Sayfa/layout katmanı ise JWT claim'lerini yerel olarak okur (getClaims) —
// böylece her navigasyonda ikinci bir Supabase Auth ağ çağrısı yapılmaz.
export async function getAuthClaims(): Promise<AuthClaims | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims || typeof claims.sub !== 'string') return null

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>
  return {
    userId: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    role: typeof meta.role === 'string' ? meta.role : '',
    fullName: typeof meta.full_name === 'string' ? meta.full_name : '',
  }
}
