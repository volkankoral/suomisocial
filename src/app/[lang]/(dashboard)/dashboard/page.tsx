import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { getUpcomingSpecialDays } from '@/lib/calendar'
import { Animate, Stagger, FadeUpItem } from '@/components/ui/animate'

export default async function DashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const countryCode = await getUserOrgCountry()
  const upcoming    = getUpcomingSpecialDays(5, countryCode)

  // Gerçek metrikler
  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  const [draftsRes, postsRes, accountsRes] = await Promise.all([
    orgId ? supabase.from('content_drafts').select('id, status').eq('organization_id', orgId) : { data: [] },
    orgId ? supabase.from('posts').select('id').eq('organization_id', orgId) : { data: [] },
    orgId ? supabase.from('social_accounts').select('platform').eq('organization_id', orgId).eq('is_active', true) : { data: [] },
  ])

  const drafts   = draftsRes.data ?? []
  const posts    = postsRes.data ?? []
  const accounts = accountsRes.data ?? []

  const pendingCount  = drafts.filter((d: { status: string }) => d.status === 'pending').length
  const approvedCount = drafts.filter((d: { status: string }) => d.status === 'approved').length

  const phases = [
    { label: 'Faz 0', desc: 'Foundation — auth, DB, deploy',              done: true,  href: null },
    { label: 'Faz 1', desc: 'Finnish takvim (tatiller + bayrak günleri)', done: true,  href: `/${lang}/calendar` },
    { label: 'Faz 2', desc: 'AI içerik üretimi (caption + görsel)',        done: true,  href: `/${lang}/content` },
    { label: 'Faz 3', desc: 'Facebook paylaşımı',                          done: true,  href: `/${lang}/social` },
    { label: 'Faz 4', desc: 'TikTok entegrasyonu',                         done: false, href: `/${lang}/social` },
    { label: 'Faz 5', desc: 'Meta Ads monitoring',                         done: true,  href: `/${lang}/ads` },
    { label: 'Faz 6', desc: 'AI reklam optimizasyonu',                     done: false, href: `/${lang}/ads` },
    { label: 'Faz 7', desc: 'SaaS dönüşümü (Stripe + onboarding)',         done: false, href: null },
  ]

  const doneCount = phases.filter((p) => p.done).length

  return (
    <div className="space-y-10">

      {/* Header */}
      <Animate>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Hoş geldin, <span className="text-foreground font-medium">{user?.email}</span>
            </p>
          </div>
          {/* Progress pill */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 rounded-xl card-premium">
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/8" />
                <circle
                  cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${(doneCount / phases.length) * 75.4} 75.4`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary">
                {doneCount}/{phases.length}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Yol haritası</p>
              <p className="text-[10px] text-muted-foreground">{doneCount} faz tamamlandı</p>
            </div>
          </div>
        </div>
      </Animate>

      {/* Stats */}
      <Animate delay={0.04}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: '📝', label: 'Bekleyen Taslak',   value: pendingCount,  href: `/${lang}/content`, color: pendingCount > 0 ? 'text-amber-400' : undefined },
            { icon: '✅', label: 'Onaylı Taslak',      value: approvedCount, href: `/${lang}/content`, color: approvedCount > 0 ? 'text-green-400' : undefined },
            { icon: '📤', label: 'Toplam Paylaşım',    value: posts.length,  href: `/${lang}/posts`,   color: undefined },
            { icon: '🔗', label: 'Bağlı Hesap',        value: accounts.length, href: `/${lang}/social`, color: accounts.length > 0 ? 'text-blue-400' : undefined },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="rounded-xl border border-white/8 bg-card px-4 py-3 flex items-center gap-3 hover:border-white/15 transition-colors">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold ${s.color ?? 'text-foreground'}`}>{s.value}</p>
              </div>
            </Link>
          ))}
        </div>
      </Animate>

      {/* Phase roadmap */}
      <Animate delay={0.05}>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Yol Haritası
          </h2>
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {phases.map((phase) => {
              const inner = (
                <div
                  className={`group relative rounded-2xl border p-4 h-full transition-all duration-200 overflow-hidden ${
                    phase.done
                      ? 'bg-blue-950/20 border-blue-500/20 hover:border-blue-500/40'
                      : 'bg-card border-white/8 hover:border-white/15 hover:bg-card/80'
                  } ${phase.href ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Done glow */}
                  {phase.done && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
                  )}
                  <p className="text-[10px] font-mono text-muted-foreground mb-1.5">{phase.label}</p>
                  <p className="text-sm font-medium text-foreground leading-snug">{phase.desc}</p>
                  {phase.done ? (
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-[9px] text-blue-400">✓</span>
                      </span>
                      <span className="text-[11px] text-blue-400 font-medium">Tamamlandı</span>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <span className="text-[11px] text-muted-foreground/60">Yakında</span>
                    </div>
                  )}
                </div>
              )
              return phase.href ? (
                <FadeUpItem key={phase.label}>
                  <Link href={phase.href} className="block h-full">{inner}</Link>
                </FadeUpItem>
              ) : (
                <FadeUpItem key={phase.label}>{inner}</FadeUpItem>
              )
            })}
          </Stagger>
        </div>
      </Animate>

      {/* Upcoming special days */}
      <Animate delay={0.1}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Yaklaşan Özel Günler
            </h2>
            <Link
              href={`/${lang}/calendar`}
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Tüm takvim →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Yaklaşan özel gün yok.</p>
          ) : (
            <Stagger className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {upcoming.map((day) => {
                const d = new Date(day.date + 'T00:00:00')
                return (
                  <FadeUpItem key={day.date + day.name}>
                    <div
                      className={`rounded-2xl border px-4 py-3.5 transition-all duration-200 hover:border-white/15 ${
                        day.isBankHoliday
                          ? 'bg-amber-950/15 border-amber-500/20 hover:border-amber-500/35'
                          : 'bg-card border-white/8 hover:bg-card/80'
                      }`}
                    >
                      <p className="text-[10px] font-mono text-muted-foreground mb-1.5">
                        {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {day.name}
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {day.isBankHoliday && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-medium">
                            Resmi Tatil
                          </span>
                        )}
                        {day.type === 'observance' && (
                          <span className="text-[9px] bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 px-1.5 py-0.5 rounded-md font-medium">
                            Anma
                          </span>
                        )}
                      </div>
                    </div>
                  </FadeUpItem>
                )
              })}
            </Stagger>
          )}
        </div>
      </Animate>

      {/* Quick actions */}
      <Animate delay={0.15}>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Hızlı Erişim
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { href: `/${lang}/content`, icon: '✨', label: 'İçerik Üret', desc: 'AI ile yeni taslak oluştur' },
              { href: `/${lang}/calendar`, icon: '🇫🇮', label: 'Takvimi Gör', desc: 'Finnish özel günleri' },
              { href: `/${lang}/brand`, icon: '⚙️', label: 'Marka Ayarları', desc: 'AI context güncelle' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-card px-4 py-3.5 hover:border-white/15 hover:bg-card/60 transition-all duration-200 group"
              >
                <span className="text-xl">{action.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Animate>

    </div>
  )
}
