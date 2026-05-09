import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { getSocialToken } from '@/lib/vault'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  // Facebook hesabını çek
  const { data: fbAccount } = await supabase
    .from('social_accounts')
    .select('id, platform_account_id, access_token_vault_id, access_token')
    .eq('organization_id', orgId)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .single()

  if (!fbAccount) {
    return NextResponse.json({ error: 'Bağlı Facebook hesabı bulunamadı' }, { status: 404 })
  }

  const pageToken = await getSocialToken(fbAccount)
  if (!pageToken) return NextResponse.json({ error: 'Facebook token okunamadı' }, { status: 500 })

  const pageId = fbAccount.platform_account_id

  // Son 25 postu çek
  const postsUrl = `${GRAPH}/${pageId}/posts?fields=id,message,full_picture,created_time&limit=25&access_token=${pageToken}`
  const postsData = await fetch(postsUrl).then(r => r.json())
  const fbPosts: Array<{
    id: string
    message?: string
    full_picture?: string
    created_time: string
  }> = postsData.data ?? []

  if (!fbPosts.length) {
    return NextResponse.json({ ok: true, synced: 0 })
  }

  // Her post için insights çek
  const insightMetrics = [
    'post_impressions',
    'post_reach',
    'post_engaged_users',
    'post_reactions_by_type_total',
    'post_clicks',
  ].join(',')

  let synced = 0

  for (const fbPost of fbPosts) {
    try {
      const insightsUrl = `${GRAPH}/${fbPost.id}/insights?metric=${insightMetrics}&access_token=${pageToken}`
      const insightsData = await fetch(insightsUrl).then(r => r.json())
      const metrics: Record<string, number> = {}

      for (const item of (insightsData.data ?? [])) {
        const val = item.values?.[1]?.value ?? item.values?.[0]?.value ?? 0
        metrics[item.name] = typeof val === 'object' ? Object.values(val as Record<string, number>).reduce((a, b) => a + b, 0) : (val as number)
      }

      const impressions   = metrics['post_impressions'] ?? 0
      const reach         = metrics['post_reach'] ?? 0
      const engaged       = metrics['post_engaged_users'] ?? 0
      const reactions     = metrics['post_reactions_by_type_total'] ?? 0
      const clicks        = metrics['post_clicks'] ?? 0
      const engagementRate = impressions > 0 ? (engaged / impressions) : 0

      const { error } = await supabase.from('posts').upsert(
        {
          organization_id:  orgId,
          social_account_id: fbAccount.id,
          platform:          'facebook',
          platform_post_id:  fbPost.id,
          caption:           fbPost.message ?? null,
          image_url:         fbPost.full_picture ?? null,
          status:            'posted',
          posted_at:         fbPost.created_time,
          impressions,
          reach,
          likes_count:       reactions,
          engagement_rate:   engagementRate,
          metadata:          { clicks },
        },
        { onConflict: 'platform_post_id' },
      )

      if (!error) synced++
    } catch {
      // tek post başarısız olursa devam et
    }
  }

  return NextResponse.json({ ok: true, synced })
}
