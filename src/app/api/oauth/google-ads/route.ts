import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/tr/login', request.url))

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  if (!clientId) return NextResponse.redirect(new URL('/tr/ads?error=google_not_configured', request.url))

  const state       = Buffer.from(`${user.id}:google_ads:${Date.now()}`).toString('base64url')
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google-ads/callback`

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id',     clientId)
  authUrl.searchParams.set('redirect_uri',  callbackUrl)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope',         'https://www.googleapis.com/auth/adwords')
  authUrl.searchParams.set('access_type',   'offline')
  authUrl.searchParams.set('prompt',        'consent')
  authUrl.searchParams.set('state',         state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('google_ads_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })
  return response
}
