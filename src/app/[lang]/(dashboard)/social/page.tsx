import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { ConnectButton } from './_components/ConnectButton'
import { DisconnectButton } from './_components/DisconnectButton'
import { Animate, Stagger, FadeUpItem } from '@/components/ui/animate'
import { translations, type Lang } from '@/lib/translations'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ connected?: string; error?: string; info?: string }>
}

type SocialAccount = {
  id: string
  platform: string
  platform_username: string | null
  created_at: string
}

const PLATFORM_BASE = [
  {
    id: 'instagram' as const,
    name: 'Instagram',
    icon: '📸',
    gradient: 'from-purple-600/20 via-pink-600/15 to-orange-600/10',
    border: 'border-purple-500/25 hover:border-purple-500/45',
    glow: 'shadow-purple-900/20',
    active: true,
    phaseNum: 3,
  },
  {
    id: 'facebook' as const,
    name: 'Facebook',
    icon: '🔵',
    gradient: 'from-blue-600/20 to-blue-800/10',
    border: 'border-blue-500/25 hover:border-blue-500/45',
    glow: 'shadow-blue-900/20',
    active: true,
    phaseNum: 3,
  },
  {
    id: 'tiktok' as const,
    name: 'TikTok',
    icon: '🎵',
    gradient: 'from-purple-600/20 to-pink-600/10',
    border: 'border-purple-500/25 hover:border-purple-500/45',
    glow: 'shadow-purple-900/20',
    active: true,
    phaseNum: 4,
  },
]

export default async function SocialPage({ params, searchParams }: Props) {
  const { lang: rawLang }           = await params
  const { connected, error, info }  = await searchParams

  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t    = translations[lang]
  const s    = t.social

  const ERROR_MESSAGES: Record<string, string> = {
    meta_not_configured: s.errMetaNotConfigured,
    state_mismatch:      s.errStateMismatch,
    oauth_failed:        s.errOauthFailed,
    no_code:             s.errNoCode,
    access_denied:       s.errAccessDenied,
    no_pages_found:      s.errNoPages,
  }

  const PLATFORMS = PLATFORM_BASE.map((p) => ({
    ...p,
    desc:  p.id === 'instagram' ? s.descInstagram : p.id === 'facebook' ? s.descFacebook : s.descTiktok,
    phase: `${s.phaseLabel} ${p.phaseNum}`,
  }))

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  const { data: accounts } = orgId
    ? await supabase
        .from('social_accounts')
        .select('id, platform, platform_username, created_at')
        .eq('organization_id', orgId)
        .eq('is_active', true)
    : { data: [] }

  const connectedPlatforms = new Set((accounts ?? []).map((a: SocialAccount) => a.platform))

  return (
    <div className="space-y-8">

      {/* Header */}
      <Animate>
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">{s.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{s.subtitle}</p>
        </div>
      </Animate>

      {/* Notifications */}
      {connected && (
        <Animate delay={0.05}>
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-4 py-3 flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
            <p className="text-sm text-emerald-300 font-medium">
              {connected === 'instagram' && s.connectedInstagram}
              {connected === 'facebook'  && s.connectedFacebook}
              {connected === 'tiktok'    && s.connectedTiktok}
            </p>
          </div>
        </Animate>
      )}
      {error && (
        <Animate delay={0.05}>
          <div className="rounded-xl border border-red-500/25 bg-red-950/15 px-4 py-3 flex items-center gap-3">
            <span className="text-red-400 text-sm">❌</span>
            <p className="text-sm text-red-300 font-medium">
              {ERROR_MESSAGES[error] ?? `${s.errFallback}${error}`}
            </p>
          </div>
        </Animate>
      )}
      {info === 'tiktok_coming_soon' && (
        <Animate delay={0.05}>
          <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 px-4 py-3">
            <p className="text-sm text-amber-300 font-medium">{s.tiktokSoon}</p>
          </div>
        </Animate>
      )}

      {/* Platform cards */}
      <Animate delay={0.08}>
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {PLATFORMS.map((p) => {
            const isConnected = connectedPlatforms.has(p.id)
            const account = (accounts ?? []).find((a: SocialAccount) => a.platform === p.id)
            return (
              <FadeUpItem key={p.id}>
                <div
                  className={`rounded-2xl border bg-card overflow-hidden transition-all duration-200 ${p.border} hover:shadow-lg ${p.glow}`}
                >
                  {/* Gradient top */}
                  <div className={`h-1 bg-gradient-to-r ${p.gradient.replace('/20', '').replace('/15', '').replace('/10', '')}`} />

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-2xl border border-white/8`}>
                        {p.icon}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono border border-white/10 px-2 py-0.5 rounded-md">
                        {p.phase}
                      </span>
                    </div>

                    <p className="font-semibold text-foreground mb-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{p.desc}</p>

                    {isConnected ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                          <span className="text-xs text-emerald-400 font-medium">
                            {s.connectedStatus}{account?.platform_username ? ` — @${account.platform_username}` : ''}
                          </span>
                        </div>
                        <DisconnectButton accountId={account!.id} />
                      </div>
                    ) : p.active ? (
                      <ConnectButton platform={p.id} lang={rawLang} />
                    ) : (
                      <div>
                        <button
                          disabled
                          className="w-full text-sm px-4 py-2.5 rounded-xl border-2 border-dashed border-white/10 text-muted-foreground/50 cursor-not-allowed"
                        >
                          {s.connectBtn}
                        </button>
                        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                          {p.phase} {s.comingSoonNote}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </FadeUpItem>
            )
          })}
        </Stagger>
      </Animate>

      {/* Security guarantee banner */}
      <Animate delay={0.12}>
        <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-950/20 to-transparent p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0 text-xl">
              🔐
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-300 mb-1 text-sm">{s.securityTitle}</h3>
              <p className="text-xs text-emerald-400/70 leading-relaxed mb-3">{s.securityDesc}</p>
              <div className="flex flex-wrap gap-3 text-[11px]">
                {[
                  { icon: '🏛️', text: s.secTag1 },
                  { icon: '🔑', text: s.secTag2 },
                  { icon: '🛡️', text: s.secTag3 },
                  { icon: '🗑️', text: s.secTag4 },
                ].map((item) => (
                  <span
                    key={item.text}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
                  >
                    <span>{item.icon}</span>
                    {item.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Animate>

      {/* Setup guide */}
      {!process.env.META_APP_ID && (
        <Animate delay={0.15}>
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-6">
            <h3 className="font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <span>⚙️</span> {s.setupTitle}
            </h3>
            <ol className="text-sm text-amber-400/80 space-y-2 list-decimal list-inside">
              <li>developers.facebook.com → Uygulamam → Ayarlar → Temel</li>
              <li>Uygulama Kimliği ve Gizli Anahtarı kopyala</li>
              <li>
                <code className="bg-amber-500/10 px-1.5 rounded text-xs font-mono">.env.local</code>
                {' '}→{' '}
                <code className="bg-amber-500/10 px-1.5 rounded text-xs font-mono">META_APP_ID=xxx META_APP_SECRET=yyy</code>
              </li>
              <li>
                Redirect URI:{' '}
                <code className="bg-amber-500/10 px-1.5 rounded text-xs font-mono">
                  http://localhost:3333/api/oauth/meta/callback
                </code>
              </li>
            </ol>
          </div>
        </Animate>
      )}

      {/* Empty state */}
      {(accounts ?? []).length === 0 && !error && (
        <Animate delay={0.18}>
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-4xl mb-4">🔗</p>
            <p className="text-sm font-medium text-foreground">{s.noAccountsTitle}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{s.noAccountsHint}</p>
          </div>
        </Animate>
      )}

      {/* Connected accounts list */}
      {(accounts ?? []).length > 0 && (
        <Animate delay={0.2}>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {s.connectedAccounts}
            </h2>
            <div className="space-y-2">
              {(accounts ?? []).map((acc: SocialAccount) => {
                const plat = PLATFORMS.find((p) => p.id === acc.platform)
                return (
                  <div
                    key={acc.id}
                    className="flex items-center gap-4 rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/14 transition-colors"
                  >
                    <span className="text-xl">{plat?.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{acc.platform}</p>
                      {acc.platform_username && (
                        <p className="text-xs text-muted-foreground">@{acc.platform_username}</p>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-400 font-medium">{s.active}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </Animate>
      )}
    </div>
  )
}
