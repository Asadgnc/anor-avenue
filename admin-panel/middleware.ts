import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'admin' | 'manager' | 'receptionist' | 'housekeeper' | 'accountant'

// Her rol hangi path prefix'lerine erişebilir
const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: ['/'],  // admin her şeye erişebilir
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

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'

  // Giriş yapılmamış → login'e yönlendir
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Giriş yapılmış + login sayfası → dashboard'a yönlendir
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rol kontrolü (giriş yapılmış kullanıcılar için)
  if (user && !isLoginPage) {
    const role = (user.user_metadata?.role as UserRole | undefined) ?? 'receptionist'

    if (!isAllowed(role, pathname)) {
      // Dashboard'a yönlendir — "Erişim yok" sayfası yerine basit redirect
      return NextResponse.redirect(new URL('/dashboard?blocked=1', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
