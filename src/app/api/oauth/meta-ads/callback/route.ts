import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

const GRAPH = 'https://graph.facebook.com/v21.0'
const lang  = 'tr'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam || !code) {
    return NextResponse.redirect(new URL(`/${lang}/ads?error=oauth_cancelled`, request.url))
  }

  const savedState = request.cookies.get('meta_ads_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL(`/${lang}/ads?error=state_mismatch`, request.url))
  }

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${lang}/login`, request.url))

  const appId       = process.env.META_APP_ID!
  const appSecret   = process.env.META_APP_SECRET!
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/meta-ads/callback`

  try {
    // Kısa → uzun ömürlü token
    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id',     appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri',  callbackUrl)
    tokenUrl.searchParams.set('code',          code)
    const tokenData = await fetch(tokenUrl.toString()).then(r => r.json())
    if (!tokenData.access_token) throw new Error('Token alınamadı')

    const llUrl = new URL(`${GRAPH}/oauth/access_token`)
    llUrl.searchParams.set('grant_type',       'fb_exchange_token')
    llUrl.searchParams.set('client_id',        appId)
    llUrl.searchParams.set('client_secret',    appSecret)
    llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)
    const llData  = await fetch(llUrl.toString()).then(r => r.json())
    const token   = llData.access_token ?? tokenData.access_token
    const expires = new Date(Date.now() + (llData.expires_in ?? 5_184_000) * 1000).toISOString()

    // Kullanıcının ad account'larını çek
    const adAccountsData = await fetch(
      `${GRAPH}/me/adaccounts?fields=id,name,account_status,currency,spend_cap&access_token=${token}`
    ).then(r => r.json())

    const adAccounts: Array<{ id: string; name: string; account_status: number; currency: string }> =
      adAccountsData.data ?? []

    const orgId  = await getUserOrgId()
    if (!orgId) throw new Error('Organizasyon bulunamadı')

    const supabase = createServiceClient()
    let savedCount = 0

    for (const acc of adAccounts) {
      const accountId = acc.id.replace('act_', '') // Meta act_XXXX → XXXX
      const { error } = await supabase.from('ad_accounts').upsert(
        {
          organization_id:  orgId,
          platform:         'meta',
          account_id:       accountId,
          account_name:     acc.name,
          access_token:     token,   // plaintext (vault migration sonraya)
          token_expires_at: expires,
          is_active:        acc.account_status === 1,
          metadata:         { currency: acc.currency, raw_id: acc.id },
        },
        { onConflict: 'organization_id,platform,account_id' },
      )
      if (!error) savedCount++
    }

    const response = NextResponse.redirect(
      new URL(`/${lang}/ads?connected=meta&accounts=${savedCount}`, request.url)
    )
    response.cookies.delete('meta_ads_state')
    return response

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Meta Ads OAuth hatası:', msg)
    return NextResponse.redirect(
      new URL(`/${lang}/ads?error=${encodeURIComponent(msg)}`, request.url)
    )
  }
}
