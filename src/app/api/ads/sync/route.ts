import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  const { data: adAccounts } = await supabase
    .from('ad_accounts')
    .select('id, account_id, access_token, metadata')
    .eq('organization_id', orgId)
    .eq('platform', 'meta')
    .eq('is_active', true)

  if (!adAccounts?.length) {
    return NextResponse.json({ error: 'Meta Ads hesabı bağlı değil' }, { status: 404 })
  }

  const today   = new Date()
  const since   = new Date(today); since.setDate(since.getDate() - 30)
  const dateStr = (d: Date) => d.toISOString().split('T')[0]

  let totalSynced = 0

  for (const account of adAccounts) {
    const rawId  = account.metadata?.raw_id ?? `act_${account.account_id}`
    const token  = account.access_token
    if (!token) continue

    const fields = 'campaign_id,campaign_name,impressions,clicks,spend,ctr,cpc,conversions,objective'
    const url = `${GRAPH}/${rawId}/insights?fields=${fields}&date_preset=last_30d&level=campaign&access_token=${token}`

    const data = await fetch(url).then(r => r.json())
    const campaigns = data.data ?? []

    for (const c of campaigns) {
      const { error } = await supabase.from('ad_campaigns').upsert(
        {
          organization_id:      orgId,
          ad_account_id:        account.id,
          platform:             'meta',
          platform_campaign_id: c.campaign_id,
          name:                 c.campaign_name,
          status:               'active',
          spend:                parseFloat(c.spend ?? '0'),
          impressions:          parseInt(c.impressions ?? '0'),
          clicks:               parseInt(c.clicks ?? '0'),
          ctr:                  parseFloat(c.ctr ?? '0'),
          cpc:                  parseFloat(c.cpc ?? '0'),
          conversions:          parseInt(c.conversions ?? '0'),
          period_start:         dateStr(since),
          period_end:           dateStr(today),
          raw_data:             c,
          fetched_at:           new Date().toISOString(),
        },
        { onConflict: 'ad_account_id,platform_campaign_id,period_start' },
      )
      if (!error) totalSynced++
    }
  }

  return NextResponse.json({ ok: true, synced: totalSynced })
}
