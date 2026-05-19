import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { upsertToken } from '@/lib/vault'
import { exchangeGoogleCode, GBP_ACCOUNT_API, GBP_INFO_API } from '@/lib/google-business'

const lang = 'tr'

interface GbpAccountInfo  { name: string; accountName?: string }
interface GbpLocationInfo {
  name:  string
  title?: string
  storefrontAddress?: { addressLines?: string[]; locality?: string }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam || !code) {
    return NextResponse.redirect(
      new URL(`/${lang}/social?error=${errorParam ?? 'no_code'}`, request.url),
    )
  }

  // CSRF doğrulama
  const savedState = request.cookies.get('google_business_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL(`/${lang}/social?error=state_mismatch`, request.url))
  }

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${lang}/login`, request.url))

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google-business/callback`

  try {
    // ── 1. Code → access + refresh token ─────────────────────────────────────
    const tok          = await exchangeGoogleCode(code, callbackUrl)
    const accessToken  = tok.access_token
    const refreshToken = tok.refresh_token
    if (!refreshToken) {
      throw new Error('Refresh token alınamadı — Google hesap izinlerini kaldırıp tekrar bağlan')
    }
    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString()

    // ── 2. Google Business hesapları ─────────────────────────────────────────
    const accountsRes  = await fetch(`${GBP_ACCOUNT_API}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const accountsData = await accountsRes.json()
    if (!accountsRes.ok) {
      throw new Error(accountsData.error?.message ?? 'Google Business hesapları alınamadı')
    }
    const accounts: GbpAccountInfo[] = accountsData.accounts ?? []

    const orgId = await getUserOrgId()
    if (!orgId) throw new Error('Organizasyon bulunamadı')
    const supabase = createServiceClient()

    // Yeniden bağlama için mevcut vault ID'leri
    const { data: existing } = await supabase
      .from('social_accounts')
      .select('platform_account_id, access_token_vault_id, refresh_token_vault_id')
      .eq('organization_id', orgId)
      .eq('platform', 'google_business')

    let savedCount = 0

    for (const account of accounts) {
      const accountId = account.name.replace('accounts/', '')

      // ── 3. Hesabın işletme lokasyonları ───────────────────────────────────
      const locRes  = await fetch(
        `${GBP_INFO_API}/${account.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const locData   = await locRes.json()
      const locations: GbpLocationInfo[] = locData.locations ?? []

      for (const loc of locations) {
        const locationId = loc.name.replace('locations/', '')
        const prev       = existing?.find((e) => e.platform_account_id === locationId)

        // Token'ları vault'a şifreli kaydet (her lokasyon kendi kopyasına sahip)
        const accessVaultId  = await upsertToken(
          accessToken,  prev?.access_token_vault_id,  `gbp_at_${orgId}_${locationId}`,
        )
        const refreshVaultId = await upsertToken(
          refreshToken, prev?.refresh_token_vault_id, `gbp_rt_${orgId}_${locationId}`,
        )

        const addr       = loc.storefrontAddress
        const addressStr = [addr?.addressLines?.join(' '), addr?.locality]
          .filter(Boolean).join(', ')

        const { error } = await supabase.from('social_accounts').upsert(
          {
            organization_id:        orgId,
            platform:               'google_business',
            platform_account_id:    locationId,
            platform_username:      loc.title ?? account.accountName ?? 'Google Business',
            access_token:           null,
            access_token_vault_id:  accessVaultId,
            refresh_token_vault_id: refreshVaultId,
            token_expires_at:       expiresAt,
            is_active:              true,
            metadata: {
              account_id:        accountId,
              account_resource:  account.name,
              location_resource: loc.name,
              address:           addressStr,
            },
          },
          { onConflict: 'organization_id,platform,platform_account_id' },
        )
        if (!error) savedCount++
      }
    }

    if (savedCount === 0) {
      return NextResponse.redirect(
        new URL(`/${lang}/social?error=no_locations_found`, request.url),
      )
    }

    console.log(`Google Business OAuth: ${savedCount} lokasyon kaydedildi (org: ${orgId})`)

    const response = NextResponse.redirect(
      new URL(`/${lang}/social?connected=google_business`, request.url),
    )
    response.cookies.delete('google_business_state')
    return response

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Google Business OAuth hatası:', msg)
    return NextResponse.redirect(
      new URL(`/${lang}/social?error=${encodeURIComponent(msg)}`, request.url),
    )
  }
}
