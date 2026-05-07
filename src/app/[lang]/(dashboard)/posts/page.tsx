import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/supabase/get-org'

interface Props { params: Promise<{ lang: string }> }

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '🔵',
  tiktok: '🎵',
}

const STATUS_STYLE: Record<string, string> = {
  posted:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  scheduled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  failed:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_LABEL: Record<string, string> = {
  posted: 'Yayında', scheduled: 'Bekliyor', failed: 'Hata',
}

export default async function PostsPage({ params }: Props) {
  await params
  const supabase = await createClient()
  const orgId = await getUserOrgId()

  const { data: posts } = orgId
    ? await supabase
        .from('posts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  // Özet istatistikler
  const totalPosts     = (posts ?? []).length
  const totalLikes     = (posts ?? []).reduce((s: number, p: { likes_count: number }) => s + (p.likes_count ?? 0), 0)
  const totalReach     = (posts ?? []).reduce((s: number, p: { reach: number }) => s + (p.reach ?? 0), 0)
  const totalImpr      = (posts ?? []).reduce((s: number, p: { impressions: number }) => s + (p.impressions ?? 0), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Yayın Geçmişi
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tüm platformlardaki paylaşımlar ve performans verileri
        </p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { icon: '📤', label: 'Toplam Post', value: totalPosts },
          { icon: '❤️', label: 'Toplam Beğeni', value: totalLikes.toLocaleString('tr') },
          { icon: '👁', label: 'Erişim', value: totalReach.toLocaleString('tr') },
          { icon: '📊', label: 'Gösterim', value: totalImpr.toLocaleString('tr') },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{s.value || '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Post listesi / boş durum */}
      {(!posts || posts.length === 0) ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Henüz paylaşım yok</p>
          <p className="text-xs text-zinc-400 mt-1">
            İçerik sayfasında taslakları onayladıktan sonra burada görünecek.
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
            likes_count: number
            comments_count: number
            reach: number
            impressions: number
            engagement_rate: number | null
          }) => (
            <div key={post.id} className="flex gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              {post.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt="" className="w-20 h-20 object-cover shrink-0" loading="lazy" />
              )}
              <div className="flex-1 min-w-0 py-3 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{PLATFORM_ICONS[post.platform] ?? '🌐'}</span>
                  <span className="text-xs capitalize text-zinc-500">{post.platform}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-1 ${STATUS_STYLE[post.status] ?? ''}`}>
                    {STATUS_LABEL[post.status] ?? post.status}
                  </span>
                  {post.posted_at && (
                    <span className="text-xs text-zinc-400 ml-auto">
                      {new Date(post.posted_at).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
                {post.caption && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-200 line-clamp-2 mb-2">{post.caption}</p>
                )}
                <div className="flex gap-4 text-xs text-zinc-400">
                  <span>❤️ {post.likes_count ?? 0}</span>
                  <span>💬 {post.comments_count ?? 0}</span>
                  <span>👁 {post.reach ?? 0}</span>
                  {post.engagement_rate != null && (
                    <span>📈 {(post.engagement_rate * 100).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
