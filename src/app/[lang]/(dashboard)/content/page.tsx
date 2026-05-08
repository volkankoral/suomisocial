import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { getUpcomingSpecialDays } from '@/lib/calendar'
import { GenerateButton } from './_components/GenerateButton'
import { DraftActions } from './_components/DraftActions'
import { Animate, Stagger, FadeUpItem } from '@/components/ui/animate'

interface Props {
  params: Promise<{ lang: string }>
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Bekliyor',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  approved: { label: 'Onaylandı', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Reddedildi',cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  posted:   { label: 'Paylaşıldı',cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
}

export default async function ContentPage({ params }: Props) {
  await params
  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  const { data: drafts } = orgId
    ? await supabase
        .from('content_drafts')
        .select('*')
        .eq('organization_id', orgId)
        .order('special_day_date', { ascending: true })
    : { data: [] }

  const upcoming     = getUpcomingSpecialDays(10)
  const draftedDates = new Set((drafts ?? []).map((d: { special_day_date: string }) => d.special_day_date))

  return (
    <div className="space-y-8">

      {/* Header */}
      <Animate>
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">İçerik Üretimi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI ile sosyal medya içeriği üret, düzenle ve onayla
          </p>
        </div>
      </Animate>

      {/* API key uyarısı */}
      {!process.env.ANTHROPIC_API_KEY && (
        <Animate delay={0.05}>
          <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 flex items-start gap-3">
            <span className="text-amber-400 text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-300">ANTHROPIC_API_KEY eksik</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                .env.local dosyasına{' '}
                <code className="font-mono bg-amber-500/10 px-1 rounded">ANTHROPIC_API_KEY=sk-ant-…</code>{' '}
                ekle.
              </p>
            </div>
          </div>
        </Animate>
      )}

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">

        {/* Sol: Yaklaşan günler */}
        <Animate delay={0.1}>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Yaklaşan Günler
            </h2>
            <div className="space-y-2">
              {upcoming.map((day) => {
                const d        = new Date(day.date + 'T00:00:00')
                const hasDraft = draftedDates.has(day.date)
                return (
                  <div
                    key={day.date}
                    className="rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/14 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-sm font-medium text-foreground leading-snug mt-0.5">
                          {day.labelTr}
                        </p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {day.holiday.isBankHoliday && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Resmi Tatil
                            </span>
                          )}
                          {day.holiday.category === 'flagday' && (
                            <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              🏳 Bayrak
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {hasDraft ? (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[8px]">✓</span>
                            Üretildi
                          </span>
                        ) : orgId ? (
                          <GenerateButton day={day} orgId={orgId} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </Animate>

        {/* Sağ: Taslaklar */}
        <Animate delay={0.12}>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Taslaklar {drafts && drafts.length > 0 && (
                <span className="normal-case text-primary ml-1 font-mono">{drafts.length}</span>
              )}
            </h2>

            {(!drafts || drafts.length === 0) && (
              <div className="rounded-2xl border border-dashed border-white/12 p-12 text-center">
                <p className="text-3xl mb-3">✨</p>
                <p className="text-sm font-medium text-foreground">Henüz taslak yok</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sol panelden bir gün seç ve &quot;İçerik Üret&quot;e bas.
                </p>
              </div>
            )}

            <Stagger className="space-y-3">
              {(drafts ?? []).map((draft: {
                id: string; special_day_date: string; special_day_label_tr: string
                caption_fi: string | null; caption_tr: string | null
                hashtags: string[] | null; image_url: string | null
                image_prompt: string | null; status: string
              }) => {
                const meta = STATUS_CONFIG[draft.status] ?? STATUS_CONFIG.pending
                const d    = new Date(draft.special_day_date + 'T00:00:00')
                return (
                  <FadeUpItem key={draft.id}>
                    <div className="rounded-2xl border border-white/8 bg-card overflow-hidden hover:border-white/14 transition-colors">
                      <div className="flex gap-0">
                        {/* Görsel */}
                        {draft.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={draft.image_url}
                            alt={draft.special_day_label_tr}
                            className="w-28 h-28 object-cover shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-28 h-28 bg-white/4 shrink-0 flex items-center justify-center text-2xl border-r border-white/8">
                            🖼
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
                              {' · '}
                              {draft.special_day_label_tr}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium shrink-0 ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>

                          {draft.caption_fi && (
                            <p className="text-sm text-foreground leading-relaxed mb-1.5 line-clamp-2">
                              {draft.caption_fi}
                            </p>
                          )}
                          {draft.caption_tr && (
                            <p className="text-xs text-muted-foreground italic leading-relaxed mb-1.5 line-clamp-1">
                              {draft.caption_tr}
                            </p>
                          )}
                          {draft.hashtags && draft.hashtags.length > 0 && (
                            <p className="text-xs text-primary/70 mb-3 line-clamp-1">
                              {draft.hashtags.map((h: string) => `#${h}`).join(' ')}
                            </p>
                          )}

                          <DraftActions draftId={draft.id} currentStatus={draft.status} />
                        </div>
                      </div>
                    </div>
                  </FadeUpItem>
                )
              })}
            </Stagger>
          </section>
        </Animate>
      </div>
    </div>
  )
}
