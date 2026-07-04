import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Handles Supabase auth callbacks: invite links, password resets, magic links.
// Supabase redirects here with ?code=... after the user clicks the email link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Preserve the user's locale from cookie, fall back to default
  const cookieHeader = request.headers.get('cookie') ?? ''
  const localeMatch = cookieHeader.match(/NEXT_LOCALE=([^;]+)/)
  const locale = localeMatch ? localeMatch[1] : 'ru'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, origin))
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=auth_callback_failed`, origin))
}
