import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://postino.vercel.app'}/api/oauth/tiktok/callback`

  // Generate state for security
  const state = crypto.randomBytes(16).toString('hex')

  // Store state in cookie
  const response = NextResponse.redirect(
    `https://www.tiktok.com/oauth/authorize?client_key=${clientKey}&scope=video.upload,user.info&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  )

  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
  })

  return response
}
