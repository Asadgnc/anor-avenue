import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

type UserRole = 'admin' | 'receptionist' | 'housekeeper' | 'accountant'

// Money / accounting paths (finance, payments ledger, reports, bills, payroll)
// are restricted to admin + accountant only.
const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: ['/'],
  receptionist: [
    '/dashboard', '/reservations', '/rooms', '/guests',
    '/registrations', '/housekeeping', '/depo', '/garden',
  ],
  housekeeper: ['/dashboard', '/housekeeping', '/depo', '/garden'],
  accountant: [
    '/dashboard', '/finance', '/payments', '/reports',
    '/bills', '/payroll', '/depo', '/timesheet',
  ],
}

// Unknown / unassigned role → only the dashboard, which renders a
// "your account is not authorized yet" notice (see (dashboard)/layout.tsx).
function isAllowed(role: string, pathname: string): boolean {
  if (role === 'admin') return true
  const allowed = ROLE_ALLOWED_PATHS[role as UserRole] ?? ['/dashboard']
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}

const handleI18nRouting = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage =
    pathname === '/login' ||
    pathname === '/' ||
    pathname === ''

  function makeRedirect(url: string) {
    const res = NextResponse.redirect(new URL(url, request.url))
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value))
    return res
  }

  if (!user && !isLoginPage) return makeRedirect('/login')
  if (user && isLoginPage) return makeRedirect('/dashboard')

  if (user && !isLoginPage) {
    // No insecure fallback: an unknown/unassigned role gets dashboard-only access.
    const role = (user.user_metadata?.role as string | undefined) ?? ''
    if (!isAllowed(role, pathname)) return makeRedirect('/dashboard?blocked=1')
  }

  // Hand off to next-intl: detects locale from NEXT_LOCALE cookie / Accept-Language
  // and internally rewrites the request to the correct [locale] page.
  const i18nResponse = handleI18nRouting(request)
  supabaseResponse.cookies.getAll().forEach((c) =>
    i18nResponse.cookies.set(c.name, c.value)
  )
  return i18nResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
