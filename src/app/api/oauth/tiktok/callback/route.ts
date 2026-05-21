import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { upsertToken } from '@/lib/vault'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://occaly.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const lang = request.cookies.get('NEXT_LOCALE')?.value ?? 'tr'

  // Kullanıcı erişimi reddettiyse
  if (error === 'access_denied') {
    return NextResponse.redirect(`${APP_URL}/${lang}/social?error=access_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/${lang}/social?error=no_code`)
  }

  // Auth kontrolü
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/${lang}/login`)
  }

  // CSRF state kontrolü
  const storedState = request.cookies.get('tiktok_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/${lang}/social?error=state_mismatch`)
  }

  try {
    // 1. Code → Access Token değişimi
    const redirectUri = `${APP_URL}/api/oauth/tiktok/callback`

    const tokenRes = await fetch('https://open.tiktokapi.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key:    process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[tiktok/callback] token error:', err)
      return NextResponse.redirect(`${APP_URL}/${lang}/social?error=tiktok_token_failed&detail=${encodeURIComponent(err.slice(0, 120))}`)
    }

    const tokenData = await tokenRes.json()
    console.log('[tiktok/callback] tokenData keys:', Object.keys(tokenData))
    const { access_token, open_id, expires_in, refresh_token, refresh_expires_in } = tokenData

    if (!access_token || !open_id) {
      console.error('[tiktok/callback] missing token fields:', JSON.stringify(tokenData))
      return NextResponse.redirect(`${APP_URL}/${lang}/social?error=tiktok_no_token&detail=${encodeURIComponent(JSON.stringify(tokenData).slice(0, 120))}`)
    }

    // 2. Kullanıcı bilgisi al
    const userRes = await fetch(
      'https://open.tiktokapi.com/v2/user/info/?fields=display_name,avatar_url,username',
      { headers: { Authorization: `Bearer ${access_token}` } },
    )

    let displayName = 'TikTok User'
    if (userRes.ok) {
      const userData = await userRes.json()
      displayName = userData.data?.user?.display_name
        ?? userData.data?.user?.username
        ?? 'TikTok User'
    }

    // 3. Vault'a şifreli kaydet
    const orgId = await getUserOrgId()
    if (!orgId) {
      return NextResponse.redirect(`${APP_URL}/${lang}/social?error=oauth_failed`)
    }

    const admin = createServiceClient()

    // Varolan vault ID'lerini al (upsert için)
    const { data: existing } = await admin
      .from('social_accounts')
      .select('access_token_vault_id, refresh_token_vault_id')
      .eq('organization_id', orgId)
      .eq('platform', 'tiktok')
      .eq('platform_account_id', open_id)
      .maybeSingle()

    const accessVaultId = await upsertToken(
      access_token,
      existing?.access_token_vault_id,
      `tiktok_access_${orgId}_${open_id}`,
    )

    let refreshVaultId: string | null = null
    if (refresh_token) {
      refreshVaultId = await upsertToken(
        refresh_token,
        existing?.refresh_token_vault_id,
        `tiktok_refresh_${orgId}_${open_id}`,
      )
    }

    // 4. DB'ye kaydet
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
    const refreshExpiresAt = refresh_expires_in
      ? new Date(Date.now() + refresh_expires_in * 1000).toISOString()
      : null

    const { error: dbErr } = await admin.from('social_accounts').upsert(
      {
        organization_id:        orgId,
        platform:               'tiktok',
        platform_account_id:    open_id,
        platform_username:      displayName,
        access_token:           null,
        access_token_vault_id:  accessVaultId,
        refresh_token_vault_id: refreshVaultId,
        token_expires_at:       expiresAt,
        is_active:              true,
        metadata:               { open_id, refresh_expires_in },
      },
      { onConflict: 'organization_id,platform,platform_account_id' },
    )

    if (dbErr) {
      console.error('[tiktok/callback] db error:', dbErr)
      return NextResponse.redirect(`${APP_URL}/${lang}/social?error=tiktok_db_failed&detail=${encodeURIComponent(dbErr.message.slice(0, 120))}`)
    }

    return NextResponse.redirect(`${APP_URL}/${lang}/social?connected=tiktok`)
  } catch (err) {
    console.error('[tiktok/callback] unexpected error:', err)
    return NextResponse.redirect(`${APP_URL}/${lang}/social?error=oauth_failed`)
  }
}
