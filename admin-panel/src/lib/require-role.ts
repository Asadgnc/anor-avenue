import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from './supabase-server'
import { getAuthClaims, type AuthClaims } from './auth-claims'

export type StaffRole = 'admin' | 'receptionist' | 'housekeeper' | 'accountant'

export type RoleCheck =
  | { ok: true; userId: string; role: StaffRole }
  | { ok: false; error: string }

// For Server Actions (mutations): the session is re-verified over the network
// with auth.getUser() — actions can be invoked via POST from any reachable
// route, so they must not trust middleware or local JWT claims alone.
export async function requireRole(...roles: StaffRole[]): Promise<RoleCheck> {
  const t = await getTranslations('errors')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('sessionInvalid') }

  const role = typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : ''
  if (!(roles as string[]).includes(role)) return { ok: false, error: t('permissionDenied') }

  return { ok: true, userId: user.id, role: role as StaffRole }
}

// For pages (reads): middleware already verified the session over the network,
// so the local JWT claims are enough here — this is defense-in-depth without
// a second Supabase Auth network call per navigation.
export async function requireRolePage(...roles: StaffRole[]): Promise<AuthClaims> {
  const claims = await getAuthClaims()
  if (!claims) redirect('/login')
  if (!(roles as string[]).includes(claims.role)) redirect('/dashboard?blocked=1')
  return claims
}
