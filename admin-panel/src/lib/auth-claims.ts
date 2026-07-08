import { createClient } from './supabase-server'

export interface AuthClaims {
  userId: string
  email: string
  role: string
  fullName: string
}

// Hem middleware hem sayfa/layout katmanı JWT claim'lerini yerel olarak doğrular
// (getClaims + ES256/JWKS) — normal akışta hiçbir istekte Supabase Auth'a ağ turu atılmaz.
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
