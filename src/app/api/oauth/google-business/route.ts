import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gbpClientId, gbpConfigured, GBP_SCOPE } from '@/lib/google-business'

// Google Business Profile OAuth akışını başlatır → Google izin ekranına yönlendirir
export async function GET(request: NextRequest) {
  const lang = request.cookies.get('NEXT_LOCALE')?.value ?? 'tr'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${lang}/login`, request.url))

  if (!gbpConfigured()) {
    return NextResponse.redirect(
      new URL(`/${lang}/social?error=google_business_not_configured`, request.url),
    )
  }

  // CSRF state: userId:platform:timestamp (base64url)
  const state       = Buffer.from(`${user.id}:google_business:${Date.now()}`).toString('base64url')
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google-business/callback`

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id',     gbpClientId())
  authUrl.searchParams.set('redirect_uri',  callbackUrl)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope',         GBP_SCOPE)
  authUrl.searchParams.set('access_type',   'offline')  // refresh token için
  authUrl.searchParams.set('prompt',        'consent')  // her seferinde refresh token döner
  authUrl.searchParams.set('state',         state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('google_business_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,  // 10 dk
    path:     '/',
  })
  return response
}
