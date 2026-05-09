import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/tr/login', request.url))

  const appId = process.env.META_APP_ID
  if (!appId) return NextResponse.redirect(new URL('/tr/ads?error=meta_not_configured', request.url))

  const stateRaw = `${user.id}:meta_ads:${Date.now()}`
  const state    = Buffer.from(stateRaw).toString('base64url')

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/meta-ads/callback`

  const scopes = [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_show_list',
  ].join(',')

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id',     appId)
  authUrl.searchParams.set('redirect_uri',  callbackUrl)
  authUrl.searchParams.set('scope',         scopes)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state',         state)

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('meta_ads_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })
  return response
}
