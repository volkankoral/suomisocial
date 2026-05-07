import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { storeToken } from '@/lib/vault'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const lang       = 'tr'

  if (errorParam || !code) {
    return NextResponse.redirect(
      new URL(`/${lang}/social?error=${errorParam ?? 'no_code'}`, request.url),
    )
  }

  // CSRF doğrulama
  const savedState = request.cookies.get('meta_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL(`/${lang}/social?error=state_mismatch`, request.url),
    )
  }

  // Platform tespiti
  let platform = 'instagram'
  try {
    platform = Buffer.from(state!, 'base64url').toString().split(':')[1] ?? 'instagram'
  } catch { /* default */ }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${lang}/login`, request.url))

  const appId       = process.env.META_APP_ID!
  const appSecret   = process.env.META_APP_SECRET!
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/meta/callback`

  try {
    // ── 1. Code → kısa ömürlü token ──────────────────────────────────────────
    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id',     appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri',  callbackUrl)
    tokenUrl.searchParams.set('code',          code)

    const tokenData = await fetch(tokenUrl.toString()).then((r) => r.json())
    if (!tokenData.access_token) throw new Error('Token exchange başarısız')

    // ── 2. Kısa → uzun ömürlü token (60 gün) ─────────────────────────────────
    const llUrl = new URL(`${GRAPH}/oauth/access_token`)
    llUrl.searchParams.set('grant_type',      'fb_exchange_token')
    llUrl.searchParams.set('client_id',       appId)
    llUrl.searchParams.set('client_secret',   appSecret)
    llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

    const llData      = await fetch(llUrl.toString()).then((r) => r.json())
    const userLLToken = llData.access_token ?? tokenData.access_token
    const expiresAt   = new Date(Date.now() + (llData.expires_in ?? 5_184_000) * 1000).toISOString()

    // ── 3. Kullanıcının FB sayfaları ──────────────────────────────────────────
    const pages: Array<{ id: string; name: string; category?: string; access_token: string }> =
      await fetch(`${GRAPH}/me/accounts?access_token=${userLLToken}&fields=id,name,category,access_token`)
        .then((r) => r.json())
        .then((d) => d.data ?? [])

    const orgId = await getUserOrgId()
    if (!orgId) throw new Error('Organizasyon bulunamadı')

    let savedCount = 0

    for (const page of pages) {
      // ── 3a. Facebook sayfası ────────────────────────────────────────────────
      if (platform === 'facebook') {
        // Token'ı vault'a şifreli kaydet
        const vaultId = await storeToken(
          page.access_token,
          `fb_page_${orgId}_${page.id}`,
        )

        const { error } = await supabase.from('social_accounts').upsert(
          {
            organization_id:       orgId,
            platform:              'facebook',
            platform_account_id:   page.id,
            platform_username:     page.name,
            access_token:          null,             // plaintext YOK
            access_token_vault_id: vaultId,          // 🔐 vault referansı
            token_expires_at:      expiresAt,
            is_active:             true,
            metadata:              { page_category: page.category ?? '' },
          },
          { onConflict: 'organization_id,platform,platform_account_id' },
        )
        if (!error) savedCount++
      }

      // ── 3b. Instagram Business hesabı ───────────────────────────────────────
      const igPageData = await fetch(
        `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      ).then((r) => r.json())

      const igAccountId: string | undefined = igPageData.instagram_business_account?.id
      if (igAccountId) {
        const igInfo = await fetch(
          `${GRAPH}/${igAccountId}?fields=username,name&access_token=${page.access_token}`,
        ).then((r) => r.json())

        // Token'ı vault'a şifreli kaydet
        const vaultId = await storeToken(
          page.access_token,
          `ig_${orgId}_${igAccountId}`,
        )

        const { error } = await supabase.from('social_accounts').upsert(
          {
            organization_id:       orgId,
            platform:              'instagram',
            platform_account_id:   igAccountId,
            platform_username:     igInfo.username ?? igInfo.name ?? '',
            access_token:          null,             // plaintext YOK
            access_token_vault_id: vaultId,          // 🔐 vault referansı
            token_expires_at:      expiresAt,
            is_active:             true,
            metadata:              { linked_page_id: page.id, page_name: page.name },
          },
          { onConflict: 'organization_id,platform,platform_account_id' },
        )
        if (!error) savedCount++
      }
    }

    console.log(`Meta OAuth: ${savedCount} hesap vault'a şifreli kaydedildi (org: ${orgId})`)

    const response = NextResponse.redirect(
      new URL(`/${lang}/social?connected=${platform}`, request.url),
    )
    response.cookies.delete('meta_oauth_state')
    return response

  } catch (err) {
    console.error('Meta OAuth callback hatası:', err)
    return NextResponse.redirect(
      new URL(`/${lang}/social?error=oauth_failed`, request.url),
    )
  }
}
