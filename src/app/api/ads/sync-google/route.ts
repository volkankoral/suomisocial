import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  const { data: accounts } = await supabase
    .from('ad_accounts')
    .select('id, account_id, access_token, refresh_token, token_expires_at')
    .eq('organization_id', orgId)
    .eq('platform', 'google')
    .eq('is_active', true)

  if (!accounts?.length) {
    return NextResponse.json({ error: 'Google Ads hesabı bağlı değil' }, { status: 404 })
  }

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
  let totalSynced = 0

  for (const account of accounts) {
    let token = account.access_token

    // Token süresi dolduysa yenile
    if (account.refresh_token && account.token_expires_at) {
      const expiresAt = new Date(account.token_expires_at).getTime()
      if (Date.now() > expiresAt - 60_000) {
        const fresh = await refreshGoogleToken(account.refresh_token)
        if (fresh) {
          token = fresh
          await supabase.from('ad_accounts').update({
            access_token:     fresh,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).eq('id', account.id)
        }
      }
    }

    if (!token) continue

    // GAQL sorgusu — son 30 günün kampanya verileri
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `

    try {
      const res = await fetch(
        `${GOOGLE_ADS_API}/customers/${account.account_id}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization':   `Bearer ${token}`,
            'developer-token': devToken,
            'Content-Type':    'application/json',
          },
          body: JSON.stringify({ query }),
        },
      )
      const data = await res.json()
      const rows = data.results ?? []

      const today = new Date()
      const since = new Date(today); since.setDate(since.getDate() - 30)
      const dateStr = (d: Date) => d.toISOString().split('T')[0]

      for (const row of rows) {
        const campaign = row.campaign
        const metrics  = row.metrics

        const spend = (metrics.costMicros ?? 0) / 1_000_000  // mikro → EUR/USD

        const { error } = await supabase.from('ad_campaigns').upsert(
          {
            organization_id:      orgId,
            ad_account_id:        account.id,
            platform:             'google',
            platform_campaign_id: campaign.id,
            name:                 campaign.name,
            status:               (campaign.status ?? 'UNKNOWN').toLowerCase(),
            spend,
            impressions:          parseInt(metrics.impressions ?? '0'),
            clicks:               parseInt(metrics.clicks ?? '0'),
            ctr:                  parseFloat(metrics.ctr ?? '0'),
            cpc:                  (metrics.averageCpc ?? 0) / 1_000_000,
            conversions:          parseInt(metrics.conversions ?? '0'),
            period_start:         dateStr(since),
            period_end:           dateStr(today),
            raw_data:             row,
            fetched_at:           new Date().toISOString(),
          },
          { onConflict: 'ad_account_id,platform_campaign_id,period_start' },
        )
        if (!error) totalSynced++
      }
    } catch (err) {
      console.error(`Google Ads sync hatası (${account.account_id}):`, err)
    }
  }

  return NextResponse.json({ ok: true, synced: totalSynced })
}
