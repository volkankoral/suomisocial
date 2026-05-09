import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { PostSyncButton } from './_components/PostSyncButton'

interface Props { params: Promise<{ lang: string }> }

export default async function PostsPage({ params }: Props) {
  await params
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
  const totalLikes = (posts ?? []).reduce((s: number, p: { likes_count: number | null }) => s + (p.likes_count ?? 0), 0)
  const totalReach = (posts ?? []).reduce((s: number, p: { reach: number | null }) => s + (p.reach ?? 0), 0)
  const totalImpr  = (posts ?? []).reduce((s: number, p: { impressions: number | null }) => s + (p.impressions ?? 0), 0)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Yayın Geçmişi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tüm platformlardaki paylaşımlar ve performans verileri
          </p>
        </div>
        <PostSyncButton />
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: '📤', label: 'Toplam Post',   value: totalPosts || '—' },
          { icon: '❤️', label: 'Toplam Beğeni', value: totalLikes ? totalLikes.toLocaleString('tr-TR') : '—' },
          { icon: '👁',  label: 'Toplam Erişim', value: totalReach ? totalReach.toLocaleString('tr-TR') : '—' },
          { icon: '📊', label: 'Gösterim',      value: totalImpr  ? totalImpr.toLocaleString('tr-TR')  : '—' },
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

      {/* Post listesi */}
      {(!posts || posts.length === 0) ? (
        <div className="rounded-xl border border-dashed border-white/12 p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-medium text-foreground">Henüz paylaşım yok</p>
          <p className="text-xs text-muted-foreground mt-1">
            İçerik sayfasında taslakları onaylayıp Facebook&apos;a paylaş, ardından &quot;Metrikleri Güncelle&quot;ye bas.
          </p>
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
              ? new Date(post.posted_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
              : null
            const hasMetrics = (post.impressions ?? 0) > 0 || (post.reach ?? 0) > 0

            return (
              <div key={post.id} className="rounded-2xl border border-white/8 bg-card overflow-hidden hover:border-white/14 transition-colors">
                <div className="flex gap-0">
                  {/* Görsel */}
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
                      🔵
                    </div>
                  )}

                  {/* İçerik */}
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-medium text-foreground capitalize flex items-center gap-1">
                        🔵 {post.platform}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 font-medium">
                        Yayında
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

                    {/* Metrikler */}
                    <div className="flex flex-wrap gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>❤️</span>
                        <span className={`font-medium ${(post.likes_count ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {post.likes_count ?? 0}
                        </span>
                        <span>beğeni</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>💬</span>
                        <span className={`font-medium ${(post.comments_count ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {post.comments_count ?? 0}
                        </span>
                        <span>yorum</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>👁</span>
                        <span className={`font-medium ${(post.reach ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {(post.reach ?? 0).toLocaleString('tr-TR')}
                        </span>
                        <span>erişim</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>📊</span>
                        <span className={`font-medium ${(post.impressions ?? 0) > 0 ? 'text-foreground' : ''}`}>
                          {(post.impressions ?? 0).toLocaleString('tr-TR')}
                        </span>
                        <span>gösterim</span>
                      </span>
                      {post.engagement_rate != null && post.engagement_rate > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>📈</span>
                          <span className="font-medium text-foreground">
                            %{(post.engagement_rate * 100).toFixed(1)}
                          </span>
                          <span>etkileşim</span>
                        </span>
                      )}
                      {post.metadata?.clicks != null && post.metadata.clicks > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>🖱</span>
                          <span className="font-medium text-foreground">{post.metadata.clicks}</span>
                          <span>tıklama</span>
                        </span>
                      )}
                      {!hasMetrics && (
                        <span className="text-xs text-muted-foreground/50 italic">
                          Metrik yok — &quot;Metrikleri Güncelle&quot;ye bas
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
