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

  let synced = 0
  const errors: string[] = []

  // ── Facebook ──────────────────────────────────────────────────────────────
  const { data: fbAccount } = await supabase
    .from('social_accounts')
    .select('id, platform_account_id, access_token_vault_id, access_token')
    .eq('organization_id', orgId)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .maybeSingle()

  if (fbAccount) {
    try {
      const pageToken = await getSocialToken(fbAccount)
      if (pageToken) {
        const pageId   = fbAccount.platform_account_id
        const postsUrl = `${GRAPH}/${pageId}/posts?fields=id,message,full_picture,created_time&limit=25&access_token=${pageToken}`
        const postsData = await fetch(postsUrl).then(r => r.json())
        const fbPosts: Array<{ id: string; message?: string; full_picture?: string; created_time: string }> = postsData.data ?? []

        const insightMetrics = [
          'post_impressions', 'post_reach', 'post_engaged_users',
          'post_reactions_by_type_total', 'post_clicks',
        ].join(',')

        for (const fbPost of fbPosts) {
          try {
            const insightsUrl  = `${GRAPH}/${fbPost.id}/insights?metric=${insightMetrics}&access_token=${pageToken}`
            const insightsData = await fetch(insightsUrl).then(r => r.json())
            const metrics: Record<string, number> = {}

            for (const item of (insightsData.data ?? [])) {
              const val = item.values?.[1]?.value ?? item.values?.[0]?.value ?? 0
              metrics[item.name] = typeof val === 'object'
                ? Object.values(val as Record<string, number>).reduce((a, b) => a + b, 0)
                : (val as number)
            }

            const impressions    = metrics['post_impressions'] ?? 0
            const reach          = metrics['post_reach'] ?? 0
            const engaged        = metrics['post_engaged_users'] ?? 0
            const reactions      = metrics['post_reactions_by_type_total'] ?? 0
            const clicks         = metrics['post_clicks'] ?? 0
            const engagementRate = impressions > 0 ? (engaged / impressions) : 0

            const { error } = await supabase.from('posts').upsert(
              {
                organization_id:   orgId,
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
                comments_count:    null,
                engagement_rate:   engagementRate,
                metadata:          { clicks },
              },
              { onConflict: 'platform_post_id' },
            )
            if (!error) synced++
          } catch { /* tek post başarısız olursa devam et */ }
        }
      }
    } catch (err) {
      errors.push(`Facebook: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── Instagram ─────────────────────────────────────────────────────────────
  const { data: igAccount } = await supabase
    .from('social_accounts')
    .select('id, platform_account_id, access_token_vault_id, access_token')
    .eq('organization_id', orgId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle()

  if (igAccount) {
    try {
      const pageToken = await getSocialToken(igAccount)
      if (pageToken) {
        const igUserId  = igAccount.platform_account_id
        const mediaUrl  = `${GRAPH}/${igUserId}/media?fields=id,caption,media_url,permalink,timestamp,like_count,comments_count,media_type&limit=25&access_token=${pageToken}`
        const mediaData = await fetch(mediaUrl).then(r => r.json())
        const igPosts: Array<{
          id: string
          caption?: string
          media_url?: string
          permalink?: string
          timestamp: string
          like_count?: number
          comments_count?: number
          media_type?: string
        }> = mediaData.data ?? []

        for (const igPost of igPosts) {
          try {
            // Insights (impressions, reach) — Business/Creator hesap gerektirir
            let impressions = 0, reach = 0, engagement = 0
            try {
              const insightsUrl  = `${GRAPH}/${igPost.id}/insights?metric=impressions,reach,engagement&access_token=${pageToken}`
              const insightsData = await fetch(insightsUrl).then(r => r.json())
              for (const item of (insightsData.data ?? [])) {
                const val = item.values?.[0]?.value ?? item.value ?? 0
                if (item.name === 'impressions') impressions = val
                if (item.name === 'reach')       reach       = val
                if (item.name === 'engagement')  engagement  = val
              }
            } catch { /* insights yoksa geç */ }

            const likes    = igPost.like_count ?? 0
            const comments = igPost.comments_count ?? 0
            const engRate  = impressions > 0 ? ((likes + comments + engagement) / impressions) : 0

            const { error } = await supabase.from('posts').upsert(
              {
                organization_id:   orgId,
                social_account_id: igAccount.id,
                platform:          'instagram',
                platform_post_id:  igPost.id,
                caption:           igPost.caption ?? null,
                image_url:         igPost.media_url ?? null,
                status:            'posted',
                posted_at:         igPost.timestamp,
                impressions,
                reach,
                likes_count:       likes,
                comments_count:    comments,
                engagement_rate:   engRate,
                metadata:          { permalink: igPost.permalink, media_type: igPost.media_type },
              },
              { onConflict: 'platform_post_id' },
            )
            if (!error) synced++
          } catch { /* tek post başarısız olursa devam et */ }
        }
      }
    } catch (err) {
      errors.push(`Instagram: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    synced,
    ...(errors.length ? { errors } : {}),
  })
}
