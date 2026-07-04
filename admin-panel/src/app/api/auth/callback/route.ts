import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Handles Supabase auth callbacks: invite links, password resets, magic links.
// Supabase redirects here with ?code=... after the user clicks the email link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/ru/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successfully authenticated — redirect to dashboard
      return NextResponse.redirect(new URL('/ru/dashboard', origin))
    }
  }

  // Something went wrong — redirect to login with error hint
  return NextResponse.redirect(new URL('/ru/login?error=auth_callback_failed', origin))
}
