import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { upcomingSpecialDays, nextFriday } from '@/lib/fi-special-days'

export default async function DashboardPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
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

  // Yaklaşan özel günler (önümüzdeki 30 gün)
  const upcoming = upcomingSpecialDays(30).slice(0, 3)

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
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Tervetuloa, {user?.email?.split('@')[0]}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bu ay <span className="text-foreground font-semibold">{monthlyPosted}</span> paylaşım yaptın</p>
      </div>

      {/* 3 ana kart */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* 1. Hafta sonu rutini */}
        <Link
          href={`/${lang}/content/new?category=weekly_routine&routineId=hyvaa-viikonloppua`}
          className="group rounded-2xl border border-white/8 bg-gradient-to-br from-amber-950/30 to-card p-5 hover:border-amber-500/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">📅</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
              Cuma {friday.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">Hyvää viikonloppua</h3>
          {weekendDraft ? (
            <p className="text-xs text-green-400">✓ Hazırlandı, onayını bekliyor</p>
          ) : (
            <p className="text-xs text-muted-foreground">Bu hafta sonu için içerik yok</p>
          )}
          <p className="text-xs text-amber-400/80 mt-3 group-hover:text-amber-400 transition-colors font-medium">
            {weekendDraft ? 'Düzenle →' : 'Hemen Hazırla →'}
          </p>
        </Link>

        {/* 2. Yaklaşan özel gün */}
        {upcoming.length > 0 ? (
          <Link
            href={`/${lang}/content/new?category=special_day&specialDayId=${upcoming[0].id}`}
            className="group rounded-2xl border border-white/8 bg-gradient-to-br from-pink-950/30 to-card p-5 hover:border-pink-500/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">🎉</span>
              <span className="text-[10px] uppercase tracking-wider text-pink-400 font-semibold">
                {upcoming[0].daysUntil} gün sonra
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">{upcoming[0].name_fi}</h3>
            {draftSpecialIds.has(upcoming[0].id) ? (
              <p className="text-xs text-green-400">✓ İçerik hazırlandı</p>
            ) : (
              <p className="text-xs text-muted-foreground">{upcoming[0].name_tr}</p>
            )}
            <p className="text-xs text-pink-400/80 mt-3 group-hover:text-pink-400 transition-colors font-medium">
              {draftSpecialIds.has(upcoming[0].id) ? 'Görüntüle →' : 'İçerik Hazırla →'}
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-card p-5 opacity-60">
            <span className="text-3xl block mb-3">🎉</span>
            <h3 className="text-base font-bold text-foreground mb-1">Özel gün yok</h3>
            <p className="text-xs text-muted-foreground">Önümüzdeki 30 gün içinde yaklaşan özel gün bulunmadı</p>
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
              Sen başlat
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">Yeni Kampanya</h3>
          <p className="text-xs text-muted-foreground">Promosyon, indirim, yeni menü</p>
          <p className="text-xs text-purple-400/80 mt-3 group-hover:text-purple-400 transition-colors font-medium">
            Hemen Oluştur →
          </p>
        </Link>

      </div>

      {/* Bekleyen taslaklar */}
      {drafts.filter((d: { status: string }) => d.status === 'pending' || d.status === 'approved').length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Bekleyen Onaylar
            </h2>
            <Link href={`/${lang}/content`} className="text-xs text-primary hover:text-primary/80 font-medium">
              Hepsini Gör →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.slice(0, 6).map((d: { id: string; status: string; special_day_label: string; special_day_date: string; image_url: string | null; category: string }) => (
              <Link
                key={d.id}
                href={`/${lang}/content`}
                className="rounded-xl border border-white/8 bg-card overflow-hidden hover:border-white/20 transition-all"
              >
                {d.image_url && (
                  <div className="aspect-square bg-zinc-900 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{d.special_day_label}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(d.special_day_date).toLocaleDateString('tr-TR')}
                    </p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      d.status === 'approved'
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {d.status === 'approved' ? '✓ Onaylı' : 'Bekliyor'}
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
              <p className="text-sm font-semibold text-amber-400 mb-1">⚠️ Eksik hesap bağlantısı</p>
              <p className="text-xs text-muted-foreground">
                {connectedPlatforms.length === 0
                  ? 'Henüz sosyal medya hesabı bağlamadın. Paylaşım yapabilmek için en az birini bağla.'
                  : `Bağlı: ${connectedPlatforms.join(', ')}. Diğer platformları da bağlayarak tüm hesaplara aynı anda paylaşım yap.`}
              </p>
            </div>
            <Link
              href={`/${lang}/social`}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors font-medium"
            >
              Hesap Bağla →
            </Link>
          </div>
        </section>
      )}

      {/* Önümüzdeki özel günler liste */}
      {upcoming.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Yaklaşan Diğer Günler
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.slice(1).map((day) => (
              <Link
                key={day.id}
                href={`/${lang}/content/new?category=special_day&specialDayId=${day.id}`}
                className="rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/15 transition-all"
              >
                <p className="text-[10px] font-mono text-muted-foreground mb-1">
                  {day.resolvedDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-sm font-medium text-foreground">{day.name_fi}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{day.daysUntil} gün</p>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
