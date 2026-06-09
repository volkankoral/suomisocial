import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { nextFriday } from '@/lib/fi-special-days'
import { getUpcoming, getWeeklyRoutines } from '@/lib/special-days'
import { getRegionForCountry } from '@/lib/regions'
import { computeRoi } from '@/lib/roi'
import { RoiPanel } from './_components/RoiPanel'
import { translations, type Lang } from '@/lib/translations'

const DATE_LOCALE: Record<string, string> = { tr: 'tr-TR', fi: 'fi-FI', en: 'en-US' }

export default async function DashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params
  const lang   = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t      = translations[lang]
  const d      = t.dashboard
  const locale = DATE_LOCALE[lang] ?? 'tr-TR'
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  // Bekleyen taslakları çek (kategori bazlı)
  const draftsRes = orgId ? await supabase
    .from('content_drafts')
    .select('id, category, status, special_day_id, special_day_label, special_day_date, image_url')
    .eq('organization_id', orgId)
    .in('status', ['pending', 'approved', 'scheduled'])
    .order('special_day_date', { ascending: true })
    : { data: [] }

  const drafts = draftsRes.data ?? []

  const accountsRes = orgId ? await supabase
    .from('social_accounts')
    .select('platform')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    : { data: [] }
  const connectedPlatforms = (accountsRes.data ?? []).map((a: { platform: string }) => a.platform)

  // Bu ay paylaşılan post sayısı
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const postsRes = orgId ? await supabase
    .from('content_drafts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'posted')
    .gte('updated_at', monthStart.toISOString())
    : { count: 0 }
  const monthlyPosted = (postsRes as { count: number | null }).count ?? 0

  // Yaklaşan özel günler (önümüzdeki 30 gün) — bölgeye göre
  const countryCode = await getUserOrgCountry()
  const region      = getRegionForCountry(countryCode)
  const upcoming    = getUpcoming(region, 30).slice(0, 3)

  // ROI hesabı — üretilen toplam içerik + paylaşım metrikleri
  const allDraftsRes = orgId ? await supabase
    .from('content_drafts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    : { count: 0 }
  const contentCreated = (allDraftsRes as { count: number | null }).count ?? 0

  const postMetricsRes = orgId ? await supabase
    .from('posts')
    .select('reach, likes_count, comments_count')
    .eq('organization_id', orgId)
    : { data: [] }
  const postRows = (postMetricsRes.data ?? []) as Array<{ reach: number | null; likes_count: number | null; comments_count: number | null }>

  const roi = computeRoi(region, {
    contentCreated,
    published:       postRows.length,
    totalReach:      postRows.reduce((s, p) => s + (p.reach ?? 0), 0),
    totalEngagement: postRows.reduce((s, p) => s + (p.likes_count ?? 0) + (p.comments_count ?? 0), 0),
  })

  // Bölgenin haftalık rutini
  const weeklyRoutine = getWeeklyRoutines(region)[0]

  // Bu hafta sonu için Cuma postu var mı?
  const friday = nextFriday()
  const fridayKey = friday.toISOString().slice(0, 10)
  const weekendDraft = drafts.find((d: { category: string; special_day_date: string }) =>
    d.category === 'weekly_routine' && d.special_day_date === fridayKey
  )

  // Özel gün için draft var mı kontrolü
  const draftSpecialIds = new Set(
    drafts
      .filter((d: { category: string }) => d.category === 'special_day')
      .map((d: { special_day_id: string | null }) => d.special_day_id)
  )

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">{d.welcome}, {user?.email?.split('@')[0]}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{d.postedSummary.replace('{n}', String(monthlyPosted))}</p>
      </div>

      {/* ROI / Değer paneli */}
      <RoiPanel roi={roi} />

      {/* 3 ana kart */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* 1. Hafta sonu rutini */}
        <Link
          href={`/${lang}/content/new?category=weekly_routine&routineId=${weeklyRoutine?.id ?? ''}`}
          className="group rounded-2xl border border-white/8 bg-gradient-to-br from-amber-950/30 to-card p-5 hover:border-amber-500/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">📅</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
              {d.friday} {friday.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">{weeklyRoutine?.name_fi ?? ''}</h3>
          {weekendDraft ? (
            <p className="text-xs text-green-400">{d.weeklyReady}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{d.weeklyNone}</p>
          )}
          <p className="text-xs text-amber-400/80 mt-3 group-hover:text-amber-400 transition-colors font-medium">
            {weekendDraft ? d.edit : d.prepareNow}
          </p>
        </Link>

        {/* 2. Yaklaşan özel gün */}
        {upcoming.length > 0 ? (
          <Link
            href={`/${lang}/content/new?category=special_day&specialDayId=${upcoming[0].id}`}
            className="group rounded-2xl border border-white/8 bg-gradient-to-br from-primary/10 to-card p-5 hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">🎉</span>
              <span className="text-[10px] uppercase tracking-wider text-pink-400 font-semibold">
                {upcoming[0].daysUntil} {d.inDays}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">{upcoming[0].name_fi}</h3>
            {draftSpecialIds.has(upcoming[0].id) ? (
              <p className="text-xs text-green-400">{d.specialReady}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{upcoming[0].name_tr}</p>
            )}
            <p className="text-xs text-pink-400/80 mt-3 group-hover:text-pink-400 transition-colors font-medium">
              {draftSpecialIds.has(upcoming[0].id) ? d.view : d.prepareContent}
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-card p-5 opacity-60">
            <span className="text-3xl block mb-3">🎉</span>
            <h3 className="text-base font-bold text-foreground mb-1">{d.noSpecialDay}</h3>
            <p className="text-xs text-muted-foreground">{d.noSpecialDayDesc}</p>
          </div>
        )}

        {/* 3. Yeni kampanya */}
        <Link
          href={`/${lang}/content/new?category=campaign`}
          className="group rounded-2xl border border-white/8 bg-gradient-to-br from-purple-950/30 to-card p-5 hover:border-purple-500/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">🎨</span>
            <span className="text-[10px] uppercase tracking-wider text-purple-400 font-semibold">
              {d.youStart}
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">{d.newCampaign}</h3>
          <p className="text-xs text-muted-foreground">{d.campaignDesc}</p>
          <p className="text-xs text-purple-400/80 mt-3 group-hover:text-purple-400 transition-colors font-medium">
            {d.createNow}
          </p>
        </Link>

      </div>

      {/* Bekleyen taslaklar */}
      {drafts.filter((d: { status: string }) => d.status === 'pending' || d.status === 'approved').length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {d.pendingApprovals}
            </h2>
            <Link href={`/${lang}/content`} className="text-xs text-primary hover:text-primary/80 font-medium">
              {d.seeAll}
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.slice(0, 6).map((draft: { id: string; status: string; special_day_label: string; special_day_date: string; image_url: string | null; category: string }) => (
              <Link
                key={draft.id}
                href={`/${lang}/content`}
                className="rounded-xl border border-white/8 bg-card overflow-hidden hover:border-white/20 transition-all"
              >
                {draft.image_url && (
                  <div className="aspect-square bg-zinc-900 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{draft.special_day_label}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(draft.special_day_date).toLocaleDateString(locale)}
                    </p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      draft.status === 'approved'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {draft.status === 'approved' ? d.approvedShort : d.pendingShort}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Hesaplar durumu */}
      {connectedPlatforms.length < 2 && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-400 mb-1">{d.missingAccounts}</p>
              <p className="text-xs text-muted-foreground">
                {connectedPlatforms.length === 0
                  ? d.noAccounts
                  : `${d.connected}: ${connectedPlatforms.join(', ')}. ${d.someAccounts}`}
              </p>
            </div>
            <Link
              href={`/${lang}/social`}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors font-medium"
            >
              {d.connectAccount}
            </Link>
          </div>
        </section>
      )}

      {/* Önümüzdeki özel günler liste */}
      {upcoming.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {d.otherUpcoming}
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.slice(1).map((day) => (
              <Link
                key={day.id}
                href={`/${lang}/content/new?category=special_day&specialDayId=${day.id}`}
                className="rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/15 transition-all"
              >
                <p className="text-[10px] font-mono text-muted-foreground mb-1">
                  {day.resolvedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-sm font-medium text-foreground">{day.name_fi}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{day.daysUntil} {d.days}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
