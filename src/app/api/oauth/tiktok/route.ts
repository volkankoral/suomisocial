import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://occaly.vercel.app'}/api/oauth/tiktok/callback`

  // Generate state for security
  const state = crypto.randomBytes(16).toString('hex')

  // Store state in cookie
  // TikTok v2 auth URL (Login Kit)
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
  authUrl.searchParams.set('client_key', clientKey!)
  // user.info.basic  → Login Kit (profil bilgisi)
  // video.upload     → Content Posting API (yükleme + yayınlama)
  // Not: video.publish artık ayrı bir scope değil, video.upload içinde
  authUrl.searchParams.set('scope', 'user.info.basic,video.upload,video.publish')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authUrl.toString())

  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
  })

  return response
}
