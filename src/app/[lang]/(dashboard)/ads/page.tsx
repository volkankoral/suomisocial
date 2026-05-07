import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/supabase/get-org'

interface Props { params: Promise<{ lang: string }> }

const AD_PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: '🔍', color: 'from-blue-500 to-green-400', phase: 'Faz 5' },
  { id: 'meta',   name: 'Meta Ads',   icon: '📘', color: 'from-blue-700 to-blue-400', phase: 'Faz 5' },
  { id: 'tiktok', name: 'TikTok Ads', icon: '🎵', color: 'from-zinc-800 to-zinc-500', phase: 'Faz 5' },
]

function fmt(n: number, prefix = '') {
  if (!n) return '—'
  return prefix + n.toLocaleString('tr')
}

export default async function AdsPage({ params }: Props) {
  await params
  const supabase = await createClient()
  const orgId = await getUserOrgId()

  const { data: adAccounts } = orgId
    ? await supabase
        .from('ad_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
    : { data: [] }

  const { data: campaigns } = orgId
    ? await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('organization_id', orgId)
        .order('fetched_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const connectedPlatforms = new Set((adAccounts ?? []).map((a: { platform: string }) => a.platform))

  // Toplam metrikler
  const totalSpend  = (campaigns ?? []).reduce((s: number, c: { spend: number }) => s + (c.spend ?? 0), 0)
  const totalImpr   = (campaigns ?? []).reduce((s: number, c: { impressions: number }) => s + (c.impressions ?? 0), 0)
  const totalClicks = (campaigns ?? []).reduce((s: number, c: { clicks: number }) => s + (c.clicks ?? 0), 0)
  const avgCTR      = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reklam Monitoring
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Google, Meta ve TikTok reklam kampanyaları — tek ekranda
        </p>
      </div>

      {/* Faz 5 banner */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-center gap-3">
        <span className="text-2xl">🚧</span>
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Faz 5 — Yapım Aşamasında</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Reklam hesaplarını bağlamak ve canlı verileri çekmek Faz 5'te aktif olacak.
            Şu an tablolar hazır, OAuth entegrasyonu bekleniyor.
          </p>
        </div>
      </div>

      {/* Metrik kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { icon: '💶', label: 'Toplam Harcama', value: fmt(totalSpend, '€') },
          { icon: '👁', label: 'Gösterim', value: fmt(totalImpr) },
          { icon: '🖱', label: 'Tıklama', value: fmt(totalClicks) },
          { icon: '📈', label: 'CTR', value: avgCTR ? `%${avgCTR.toFixed(2)}` : '—' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{m.icon}</span>
            <div>
              <p className="text-xs text-zinc-500">{m.label}</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform bağlantıları */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {AD_PLATFORMS.map((p) => {
          const connected = connectedPlatforms.has(p.id)
          return (
            <div key={p.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-xs text-zinc-400 font-mono">{p.phase}</span>
                </div>
                <p className="font-medium text-zinc-800 dark:text-zinc-100 text-sm">{p.name}</p>
                <div className="mt-3">
                  {connected ? (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Bağlı
                    </span>
                  ) : (
                    <button disabled className="w-full text-xs px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 cursor-not-allowed">
                      + Bağla ({p.phase})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Kampanya tablosu */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">
          Kampanyalar
        </h2>
        {(!campaigns || campaigns.length === 0) ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-sm text-zinc-500">Henüz kampanya verisi yok</p>
            <p className="text-xs text-zinc-400 mt-1">Reklam hesabı bağlandıktan sonra veriler otomatik çekilecek.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  {['Platform', 'Kampanya', 'Durum', 'Harcama', 'Gösterim', 'CTR', 'ROAS'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-zinc-500 uppercase px-4 py-2.5 tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(campaigns ?? []).map((c: {
                  id: string; platform: string; name: string | null; status: string | null
                  spend: number; impressions: number; ctr: number | null; roas: number | null
                }) => (
                  <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <td className="px-4 py-3 capitalize text-zinc-500 text-xs">{c.platform}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100 max-w-[200px] truncate">{c.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>{c.status ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{c.spend ? `€${c.spend}` : '—'}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{c.impressions?.toLocaleString('tr') ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{c.ctr ? `%${(c.ctr * 100).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{c.roas ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
