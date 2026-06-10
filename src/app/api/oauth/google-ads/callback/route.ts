import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'

export async function GET(request: NextRequest) {
  const lang = request.cookies.get('NEXT_LOCALE')?.value ?? 'tr'
  const { searchParams } = request.nextUrl
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam || !code) {
    return NextResponse.redirect(new URL(`/${lang}/ads?error=oauth_cancelled`, request.url))
  }

  const savedState = request.cookies.get('google_ads_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL(`/${lang}/ads?error=state_mismatch`, request.url))
  }

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${lang}/login`, request.url))

  const clientId     = process.env.GOOGLE_ADS_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!
  const devToken     = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
  const callbackUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google-ads/callback`

  try {
    // Code → token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  callbackUrl,
        grant_type:    'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('Token alınamadı')

    const accessToken  = tokenData.access_token  as string
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresIn    = tokenData.expires_in    as number ?? 3600
    const expires      = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Erişilebilir Google Ads hesaplarını çek
    const customersRes = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
      headers: {
        'Authorization':  `Bearer ${accessToken}`,
        'developer-token': devToken,
      },
    })
    const customersData = await customersRes.json()
    const resourceNames: string[] = customersData.resourceNames ?? []

    const orgId = await getUserOrgId()
    if (!orgId) throw new Error('Organizasyon bulunamadı')

    const supabase    = createServiceClient()
    let savedCount    = 0

    for (const resourceName of resourceNames) {
      // "customers/1234567890" → "1234567890"
      const customerId = resourceName.replace('customers/', '')

      // Hesap adını çek
      let accountName = customerId
      try {
        const infoRes = await fetch(
          `${GOOGLE_ADS_API}/customers/${customerId}`,
          {
            headers: {
              'Authorization':   `Bearer ${accessToken}`,
              'developer-token': devToken,
            },
          },
        )
        const infoData = await infoRes.json()
        accountName    = infoData.descriptiveName ?? infoData.id ?? customerId
      } catch { /* isim alınamazsa ID kullan */ }

      const { error } = await supabase.from('ad_accounts').upsert(
        {
          organization_id:  orgId,
          platform:         'google',
          account_id:       customerId,
          account_name:     accountName,
          access_token:     accessToken,
          refresh_token:    refreshToken ?? null,
          token_expires_at: expires,
          is_active:        true,
          metadata:         { resource_name: resourceName },
        },
        { onConflict: 'organization_id,platform,account_id' },
      )
      if (!error) savedCount++
    }

    const response = NextResponse.redirect(
      new URL(`/${lang}/ads?connected=google&accounts=${savedCount}`, request.url)
    )
    response.cookies.delete('google_ads_state')
    return response

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Google Ads OAuth hatası:', msg)
    return NextResponse.redirect(
      new URL(`/${lang}/ads?error=${encodeURIComponent(msg)}`, request.url)
    )
  }
}
