import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { PostSyncButton } from './_components/PostSyncButton'
import { translations, type Lang } from '@/lib/translations'

export const dynamic = 'force-dynamic'

const DATE_LOCALE: Record<string, string> = { tr: 'tr-TR', fi: 'fi-FI', en: 'en-US' }

interface Props { params: Promise<{ lang: string }> }

export default async function PostsPage({ params }: Props) {
  const { lang: rawLang } = await params
  const lang   = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t      = translations[lang]
  const p      = t.posts
  const locale = DATE_LOCALE[lang] ?? 'tr-TR'

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  const { data: posts } = orgId
    ? await supabase
        .from('posts')
        .select('*')
        .eq('organization_id', orgId)
        .order('posted_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const totalPosts = (posts ?? []).length
  const totalLikes = (posts ?? []).reduce((s: number, x: { likes_count: number | null }) => s + (x.likes_count ?? 0), 0)
  const totalReach = (posts ?? []).reduce((s: number, x: { reach: number | null }) => s + (x.reach ?? 0), 0)
  const totalImpr  = (posts ?? []).reduce((s: number, x: { impressions: number | null }) => s + (x.impressions ?? 0), 0)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">{p.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>
        </div>
        <PostSyncButton />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: '📤', label: p.totalPosts,  value: totalPosts || '—' },
          { icon: '❤️', label: p.totalLikes, value: totalLikes ? totalLikes.toLocaleString(locale) : '—' },
          { icon: '👁',  label: p.totalReach, value: totalReach ? totalReach.toLocaleString(locale) : '—' },
          { icon: '📊', label: p.totalImpr,   value: totalImpr  ? totalImpr.toLocaleString(locale)  : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Post list */}
      {(!posts || posts.length === 0) ? (
        <div className="rounded-xl border border-dashed border-white/12 p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-medium text-foreground">{p.empty}</p>
          <p className="text-xs text-muted-foreground mt-1">{p.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(posts ?? []).map((post: {
            id: string
            platform: string
            image_url: string | null
            caption: string | null
            hashtags: string[] | null
            status: string
            posted_at: string | null
            likes_count: number | null
            comments_count: number | null
            reach: number | null
            impressions: number | null
            engagement_rate: number | null
            metadata: { clicks?: number } | null
          }) => {
            const postedDate = post.posted_at
              ? new Date(post.posted_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
              : null
            const hasMetrics = (post.impressions ?? 0) > 0 || (post.reach ?? 0) > 0

            return (
              <div key={post.id} className="rounded-2xl border border-white/8 bg-card overflow-hidden hover:border-white/14 transition-colors">
                <div className="flex gap-0">
                  {/* Image */}
                  {post.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-24 h-24 object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-white/4 shrink-0 flex items-center justify-center text-2xl border-r border-white/8">
                      {post.platform === 'instagram' ? '📷' : post.platform === 'facebook' ? '👍' : '🔵'}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-medium text-foreground capitalize flex items-center gap-1">
                        {post.platform === 'instagram' ? '📷' : post.platform === 'facebook' ? '👍' : post.platform === 'tiktok' ? '🎵' : '🔵'} {post.platform}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 font-medium">
                        {p.live}
                      </span>
                      {postedDate && (
                        <span className="text-xs text-muted-foreground ml-auto">{postedDate}</span>
                      )}
                    </div>

                    {post.caption && (
                      <p className="text-sm text-foreground line-clamp-2 mb-2 leading-relaxed">
                        {post.caption}
                      </p>
                    )}

                    {/* Metrics */}
                    <div className="flex flex-wrap gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>❤️</span>
                        <span className={`font-medium ${(post.likes_count ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {post.likes_count ?? 0}
                        </span>
                        <span>{p.likes}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>💬</span>
                        <span className={`font-medium ${(post.comments_count ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {post.comments_count ?? 0}
                        </span>
                        <span>{p.comments}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>👁</span>
                        <span className={`font-medium ${(post.reach ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {(post.reach ?? 0).toLocaleString(locale)}
                        </span>
                        <span>{p.reach}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>📊</span>
                        <span className={`font-medium ${(post.impressions ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {(post.impressions ?? 0).toLocaleString(locale)}
                        </span>
                        <span>{p.impressions}</span>
                      </span>
                      {post.engagement_rate != null && post.engagement_rate > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>📈</span>
                          <span className="font-medium text-foreground">
                            {(post.engagement_rate * 100).toFixed(1)}%
                          </span>
                          <span>{p.engagement}</span>
                        </span>
                      )}
                      {post.metadata?.clicks != null && post.metadata.clicks > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>🖱</span>
                          <span className="font-medium text-foreground">{post.metadata.clicks}</span>
                          <span>{p.clicks}</span>
                        </span>
                      )}
                      {!hasMetrics && (
                        <span className="text-xs text-muted-foreground/50 italic">
                          {p.noMetrics}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
