import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/tr/login', request.url))
  }

  const platform = request.nextUrl.searchParams.get('platform') ?? 'instagram'

  const appId = process.env.META_APP_ID
  if (!appId) {
    return NextResponse.redirect(
      new URL('/tr/social?error=meta_not_configured', request.url),
    )
  }

  // CSRF state: userId:platform:timestamp  (base64url encoded)
  const stateRaw = `${user.id}:${platform}:${Date.now()}`
  const state = Buffer.from(stateRaw).toString('base64url')

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/meta/callback`

  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
  ].join(',')

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', callbackUrl)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)

  // Store state in cookie for CSRF validation
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}
