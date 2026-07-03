import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

type UserRole = 'admin' | 'manager' | 'receptionist' | 'housekeeper' | 'accountant'

// Each role's allowed path prefixes (WITHOUT locale prefix)
const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: ['/'],  // admin can access everything
  manager: [
    '/dashboard', '/reservations', '/rooms', '/guests',
    '/registrations', '/housekeeping', '/payments', '/reports',
    '/depo', '/garden',
  ],
  receptionist: [
    '/dashboard', '/reservations', '/rooms', '/guests',
    '/registrations', '/housekeeping', '/payments',
    '/depo', '/garden',
  ],
  housekeeper: ['/dashboard', '/housekeeping', '/depo', '/garden'],
  accountant: ['/dashboard', '/payments', '/reports', '/depo'],
}

function isAllowed(role: UserRole, pathname: string): boolean {
  if (role === 'admin') return true
  const allowed = ROLE_ALLOWED_PATHS[role] ?? ['/dashboard']
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}

// Strip locale prefix so RBAC can compare against plain paths like /dashboard
function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length) || '/'
    }
  }
  return pathname
}

const handleI18nRouting = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Supabase client for auth — tracks cookie mutations
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
  const pathWithoutLocale = stripLocale(pathname)
  const isLoginPage =
    pathWithoutLocale === '/login' ||
    pathWithoutLocale === '/' ||
    pathWithoutLocale === ''

  // Helper: build a redirect response that carries any refreshed Supabase cookies
  function makeRedirect(url: string) {
    const res = NextResponse.redirect(new URL(url, request.url))
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value))
    return res
  }

  // Not authenticated → send to login
  if (!user && !isLoginPage) {
    return makeRedirect('/ru/login')
  }

  // Authenticated on login/root → send to dashboard
  if (user && isLoginPage) {
    return makeRedirect('/ru/dashboard')
  }

  // RBAC check for authenticated users
  if (user && !isLoginPage) {
    const role = (user.user_metadata?.role as UserRole | undefined) ?? 'receptionist'
    if (!isAllowed(role, pathWithoutLocale)) {
      return makeRedirect('/ru/dashboard?blocked=1')
    }
  }

  // Hand off to next-intl (locale detection / prefix redirect)
  const i18nResponse = handleI18nRouting(request)

  // Merge any refreshed Supabase auth cookies into the i18n response
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
