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
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      // Next.js fetch cache'ini devre dışı bırak
      cache: 'no-store',
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

    // Varolan vault ID'sini al (upsert için)
    const { data: existing } = await admin
      .from('social_accounts')
      .select('access_token_vault_id')
      .eq('organization_id', orgId)
      .eq('platform', 'tiktok')
      .eq('platform_account_id', open_id)
      .maybeSingle()

    // 3b. Vault'a kaydet (hata olursa plaintext fallback)
    let accessVaultId: string | null = null
    try {
      accessVaultId = await upsertToken(
        access_token,
        existing?.access_token_vault_id,
        `tiktok_access_${orgId}_${open_id}`,
      )
    } catch (vaultErr: unknown) {
      const msg = vaultErr instanceof Error ? vaultErr.message : String(vaultErr)
      console.error('[tiktok/callback] vault error:', msg)
      return NextResponse.redirect(
        `${APP_URL}/${lang}/social?error=tiktok_vault_failed&detail=${encodeURIComponent(msg.slice(0, 150))}`,
      )
    }

    // 4. DB'ye kaydet
    const expiresAt = new Date(Date.now() + (expires_in ?? 86400) * 1000).toISOString()

    const { error: dbErr } = await admin.from('social_accounts').upsert(
      {
        organization_id:       orgId,
        platform:              'tiktok',
        platform_account_id:   open_id,
        platform_username:     displayName,
        access_token:          null,
        access_token_vault_id: accessVaultId,
        token_expires_at:      expiresAt,
        is_active:             true,
        metadata:              { open_id, has_refresh: !!refresh_token },
      },
      { onConflict: 'organization_id,platform,platform_account_id' },
    )

    if (dbErr) {
      console.error('[tiktok/callback] db error:', dbErr)
      return NextResponse.redirect(`${APP_URL}/${lang}/social?error=tiktok_db_failed&detail=${encodeURIComponent(dbErr.message.slice(0, 120))}`)
    }

    return NextResponse.redirect(`${APP_URL}/${lang}/social?connected=tiktok`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[tiktok/callback] unexpected error:', msg)
    return NextResponse.redirect(`${APP_URL}/${lang}/social?error=oauth_failed&detail=${encodeURIComponent(msg.slice(0, 150))}`)
  }
}
