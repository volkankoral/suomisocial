import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function GET(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  // Verify state
  const storedState = request.cookies.get('tiktok_oauth_state')?.value
  if (storedState !== state) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  try {
    // Exchange code for access token (TikTok v2)
    const tokenResponse = await fetch('https://open.tiktokapi.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://suomisocial-ruby.vercel.app'}/api/oauth/tiktok/callback`,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text()
      console.error('TikTok token error:', err)
      return NextResponse.json({ error: 'Failed to get token' }, { status: 500 })
    }

    const { access_token, open_id, expires_in } = await tokenResponse.json()

    // Get user info (TikTok v2)
    const userResponse = await fetch('https://open.tiktokapi.com/v2/user/info/?fields=display_name,avatar_url', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 })
    }

    const userData = await userResponse.json()
    const displayName = userData.data?.user?.display_name || 'TikTok User'

    // Save to database
    const orgId = await getUserOrgId()
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('social_accounts')
      .upsert(
        {
          organization_id: orgId,
          platform: 'tiktok',
          platform_user_id: open_id,
          display_name: displayName,
          access_token,
          refresh_token: null, // TikTok doesn't provide refresh token in this flow
          token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
          is_connected: true,
        },
        { onConflict: 'organization_id,platform' }
      )

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Redirect to social accounts page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://postino.vercel.app'}/tr/social?connected=tiktok`)
  } catch (err) {
    console.error('OAuth error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
