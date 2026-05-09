import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { SyncButton } from './_components/SyncButton'

interface Props { params: Promise<{ lang: string }> }

function fmt(n: number | null | undefined, prefix = '') {
  if (!n) return '—'
  return prefix + n.toLocaleString('tr-TR')
}

function fmtCtr(ctr: number | null | undefined) {
  if (!ctr) return '—'
  // Meta API returns CTR as a decimal like 0.025 → %2.50
  return `%${(ctr * 100).toFixed(2)}`
}

export default async function AdsPage({ params }: Props) {
  await params
  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  const { data: adAccounts } = orgId
    ? await supabase
        .from('ad_accounts')
        .select('id, platform, account_name, account_id, token_expires_at, is_active, metadata')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
    : { data: [] }

  const { data: campaigns } = orgId
    ? await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('organization_id', orgId)
        .order('fetched_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const activeAccounts     = (adAccounts ?? []).filter((a: { is_active: boolean }) => a.is_active)
  const connectedPlatforms = new Set(activeAccounts.map((a: { platform: string }) => a.platform))
  const metaConnected      = connectedPlatforms.has('meta')
  const googleConnected    = connectedPlatforms.has('google')

  // Toplam metrikler
  const totalSpend  = (campaigns ?? []).reduce((s: number, c: { spend: number | null }) => s + (c.spend ?? 0), 0)
  const totalImpr   = (campaigns ?? []).reduce((s: number, c: { impressions: number | null }) => s + (c.impressions ?? 0), 0)
  const totalClicks = (campaigns ?? []).reduce((s: number, c: { clicks: number | null }) => s + (c.clicks ?? 0), 0)
  const avgCTR      = totalImpr > 0 ? totalClicks / totalImpr : 0

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Reklam İzleme</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Meta reklam kampanyaları — harcama, gösterim ve tıklama verileri
          </p>
        </div>
        {(metaConnected || googleConnected) && (
          <SyncButton hasGoogle={googleConnected} hasMeta={metaConnected} />
        )}
      </div>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: '💶', label: 'Toplam Harcama', value: totalSpend ? `€${totalSpend.toFixed(2)}` : '—' },
          { icon: '👁',  label: 'Gösterim',       value: fmt(totalImpr) },
          { icon: '🖱',  label: 'Tıklama',        value: fmt(totalClicks) },
          { icon: '📈', label: 'Ort. CTR',        value: avgCTR ? `%${(avgCTR * 100).toFixed(2)}` : '—' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-white/8 bg-card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{m.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-xl font-bold text-foreground">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform bağlantıları */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Reklam Hesapları
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">

          {/* Meta Ads */}
          <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-700 to-blue-400" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📘</span>
                {metaConnected && (
                  <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-lg font-medium">
                    Bağlı
                  </span>
                )}
              </div>
              <p className="font-medium text-foreground text-sm">Meta Ads</p>
              {metaConnected ? (
                <div className="mt-2 space-y-1">
                  {activeAccounts
                    .filter((a: { platform: string }) => a.platform === 'meta')
                    .map((a: { id: string; account_name: string | null; account_id: string }) => (
                      <p key={a.id} className="text-xs text-muted-foreground truncate">
                        {a.account_name ?? a.account_id}
                      </p>
                    ))}
                  <a
                    href="/api/oauth/meta-ads"
                    className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                  >
                    Yeniden bağla
                  </a>
                </div>
              ) : (
                <div className="mt-3">
                  <a
                    href="/api/oauth/meta-ads"
                    className="block w-full text-center text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                  >
                    + Meta Ads Bağla
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Google Ads */}
          <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-green-400" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔍</span>
                {googleConnected && (
                  <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-lg font-medium">
                    Bağlı
                  </span>
                )}
              </div>
              <p className="font-medium text-foreground text-sm">Google Ads</p>
              {googleConnected ? (
                <div className="mt-2 space-y-1">
                  {activeAccounts
                    .filter((a: { platform: string }) => a.platform === 'google')
                    .map((a: { id: string; account_name: string | null; account_id: string }) => (
                      <p key={a.id} className="text-xs text-muted-foreground truncate">
                        {a.account_name ?? a.account_id}
                      </p>
                    ))}
                  <a
                    href="/api/oauth/google-ads"
                    className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                  >
                    Yeniden bağla
                  </a>
                </div>
              ) : (
                <div className="mt-3">
                  <a
                    href="/api/oauth/google-ads"
                    className="block w-full text-center text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    + Google Ads Bağla
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* TikTok Ads (yakında) */}
          <div className="rounded-xl border border-white/8 bg-card overflow-hidden opacity-50">
            <div className="h-1.5 bg-gradient-to-r from-zinc-600 to-zinc-400" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎵</span>
                <span className="text-xs text-muted-foreground font-mono">Yakında</span>
              </div>
              <p className="font-medium text-foreground text-sm">TikTok Ads</p>
              <div className="mt-3">
                <button disabled className="w-full text-xs px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-muted-foreground cursor-not-allowed">
                  + Bağla (yakında)
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Kampanya tablosu */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Kampanyalar {campaigns && campaigns.length > 0 && (
              <span className="normal-case text-primary ml-1 font-mono">{campaigns.length}</span>
            )}
          </h2>
          {!metaConnected && (
            <p className="text-xs text-muted-foreground">Meta Ads bağlandıktan sonra veriler görünecek</p>
          )}
        </div>

        {(!campaigns || campaigns.length === 0) ? (
          <div className="rounded-xl border border-dashed border-white/12 p-12 text-center">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-sm font-medium text-foreground">Henüz kampanya verisi yok</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metaConnected
                ? 'Yukarıdaki "Senkronize Et" butonuna bas.'
                : 'Meta Ads hesabını bağla ve senkronize et.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/2">
                  {['Platform', 'Kampanya', 'Durum', 'Harcama', 'Gösterim', 'Tıklama', 'CTR', 'CPC'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5 tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(campaigns ?? []).map((c: {
                  id: string
                  platform: string
                  name: string | null
                  status: string | null
                  spend: number | null
                  impressions: number | null
                  clicks: number | null
                  ctr: number | null
                  cpc: number | null
                }) => (
                  <tr key={c.id} className="border-b border-white/6 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 capitalize text-muted-foreground text-xs font-mono">{c.platform}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate" title={c.name ?? undefined}>
                      {c.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        c.status === 'active'
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'bg-white/8 text-muted-foreground'
                      }`}>
                        {c.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">
                      {c.spend ? `€${c.spend.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">
                      {c.impressions ? c.impressions.toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">
                      {c.clicks ? c.clicks.toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">
                      {fmtCtr(c.ctr)}
                    </td>
                    <td className="px-4 py-3 text-foreground tabular-nums">
                      {c.cpc ? `€${c.cpc.toFixed(3)}` : '—'}
                    </td>
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
