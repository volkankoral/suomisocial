import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { getUpcomingSpecialDays } from '@/lib/calendar'
import { GenerateButton } from './_components/GenerateButton'
import { DraftActions } from './_components/DraftActions'
import { PreviewModal } from './_components/PreviewModal'
import { EditDraftModal } from './_components/EditDraftModal'
import { BulkDeleteButton } from './_components/BulkDeleteButton'
import { ImageOverlayPreview } from './_components/ImageOverlayPreview'
import { Animate, Stagger, FadeUpItem } from '@/components/ui/animate'
import { translations, type Lang } from '@/lib/translations'
import Link from 'next/link'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ view?: string }>
}

export const dynamic = 'force-dynamic'

const STATUS_CLS: Record<string, string> = {
  pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
  posted:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
}

interface DraftRow {
  id: string; special_day_date: string; special_day_label_tr: string
  caption_fi: string | null; caption_tr: string | null
  hashtags: string[] | null; image_url: string | null
  image_prompt: string | null; status: string; archived: boolean | null
  overlay_template: string | null; overlay_text: string | null
}

export default async function ContentPage({ params, searchParams }: Props) {
  const { lang: rawLang } = await params
  const { view }          = await searchParams
  const lang   = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t      = translations[lang]
  const isArchive = view === 'archive'

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()

  // Taslakları arşiv durumuna göre filtrele
  const draftsQuery = orgId
    ? supabase.from('content_drafts').select('*').eq('organization_id', orgId).order('special_day_date', { ascending: true })
    : null

  const { data: drafts } = draftsQuery
    ? isArchive
      ? await draftsQuery.eq('archived', true)
      : await draftsQuery.or('archived.is.null,archived.eq.false')
    : { data: [] as DraftRow[] }

  const { data: brand } = orgId
    ? await supabase.from('brand_settings').select('business_name, logo_url').eq('organization_id', orgId).maybeSingle()
    : { data: null }

  const { data: igAccount } = orgId
    ? await supabase.from('social_accounts').select('platform_username').eq('organization_id', orgId).eq('platform', 'instagram').eq('is_active', true).maybeSingle()
    : { data: null }

  const brandName  = brand?.business_name ?? 'yourbrand'
  const logoUrl    = brand?.logo_url ?? undefined
  const igUsername = igAccount?.platform_username ?? undefined

  const countryCode  = await getUserOrgCountry()
  const upcoming     = getUpcomingSpecialDays(10, countryCode)
  const draftedDates = new Set((drafts ?? []).map((d: { special_day_date: string }) => d.special_day_date))

  const draftList = (drafts ?? []) as DraftRow[]

  // Taslak kartı render fonksiyonu
  function renderDraft(draft: DraftRow) {
    const cls = STATUS_CLS[draft.status] ?? STATUS_CLS.pending
    const lbl = t.status[draft.status as keyof typeof t.status] ?? t.status.pending
    const d   = new Date(draft.special_day_date + 'T00:00:00')
    return (
      <FadeUpItem key={draft.id}>
        <div className="rounded-2xl border border-white/8 bg-card overflow-hidden hover:border-white/14 transition-colors">
          <div className="flex flex-col sm:flex-row">
            <ImageOverlayPreview
              imageUrl={draft.image_url}
              templateId={draft.overlay_template}
              mainText={draft.overlay_text ?? brandName}
              subText={draft.special_day_label_tr}
              className="w-full sm:w-32 sm:h-32 h-40 shrink-0 border-b sm:border-b-0 sm:border-r border-white/8"
            />

            <div className="flex-1 min-w-0 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[11px] text-muted-foreground font-mono">
                  {d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}
                  {' · '}
                  {draft.special_day_label_tr}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium shrink-0 ${cls}`}>
                  {lbl}
                </span>
              </div>

              {draft.caption_fi && (
                <p className="text-sm text-foreground leading-relaxed mb-1.5 line-clamp-2">{draft.caption_fi}</p>
              )}
              {draft.caption_tr && (
                <p className="text-xs text-muted-foreground italic leading-relaxed mb-1.5 line-clamp-1">{draft.caption_tr}</p>
              )}
              {draft.hashtags && draft.hashtags.length > 0 && (
                <p className="text-xs text-primary/70 mb-3 line-clamp-1">
                  {draft.hashtags.map((h: string) => `#${h}`).join(' ')}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <DraftActions draftId={draft.id} currentStatus={draft.status} archived={!!draft.archived} />
                <EditDraftModal
                  draftId={draft.id}
                  captionFi={draft.caption_fi ?? ''}
                  captionTr={draft.caption_tr ?? ''}
                  hashtags={draft.hashtags ?? []}
                  imageUrl={draft.image_url}
                  overlayTemplate={draft.overlay_template}
                  overlayText={draft.overlay_text}
                  businessName={brandName}
                  specialDayLabel={draft.special_day_label_tr}
                />
                <PreviewModal draft={draft} brandName={brandName} igUsername={igUsername} logoUrl={logoUrl} />
              </div>
            </div>
          </div>
        </div>
      </FadeUpItem>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <Animate>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text">{t.content.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.content.subtitle}</p>
          </div>
          <Link
            href={`/${lang}/content/new`}
            className="shrink-0 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {t.content.newContent}
          </Link>
        </div>
      </Animate>

      {/* API key warning */}
      {!process.env.ANTHROPIC_API_KEY && !isArchive && (
        <Animate delay={0.05}>
          <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 flex items-start gap-3">
            <span className="text-amber-400 text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-300">{t.content.missingApiKey}</p>
              <p className="text-xs text-amber-400/70 mt-0.5">{t.content.missingApiHint}</p>
            </div>
          </div>
        </Animate>
      )}

      {/* AI görsel uyarısı */}
      {!isArchive && (
        <Animate delay={0.06}>
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-3.5 flex items-start gap-3">
            <span className="text-blue-400 text-base shrink-0 mt-0.5">🤖</span>
            <p className="text-xs text-blue-300/80 leading-relaxed">
              <span className="font-semibold text-blue-200">Yapay zeka görselleri hakkında:</span>{' '}
              AI tarafından üretilen görseller bazen bozuk çıkabilir (yüz deformasyonu, fazla parmak vb.).
              Taslakları paylaşmadan önce mutlaka görselleri kontrol edin.
            </p>
          </div>
        </Animate>
      )}

      {/* Sekmeler */}
      <Animate delay={0.08}>
        <div className="flex items-center gap-1 border-b border-white/8">
          <Link
            href={`/${lang}/content`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              !isArchive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.content.tabActive}
          </Link>
          <Link
            href={`/${lang}/content?view=archive`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isArchive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            📦 {t.content.tabArchive}
          </Link>
        </div>
      </Animate>

      {/* ARŞİV GÖRÜNÜMÜ — tek kolon */}
      {isArchive ? (
        <Animate delay={0.1}>
          <section className="space-y-3">
            {draftList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/12 p-12 text-center">
                <p className="text-3xl mb-3">📦</p>
                <p className="text-sm font-medium text-foreground">{t.content.noArchive}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{t.content.noArchiveHint}</p>
              </div>
            ) : (
              <Stagger className="space-y-3">
                {draftList.map(renderDraft)}
              </Stagger>
            )}
          </section>
        </Animate>
      ) : (
        /* AKTİF GÖRÜNÜM — iki kolon */
        <>
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-[300px_1fr]">

            {/* Yaklaşan günler */}
            <Animate delay={0.1}>
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {t.content.upcomingDays}
                </h2>
                <div className="space-y-2">
                  {upcoming.map((day) => {
                    const d        = new Date(day.date + 'T00:00:00')
                    const hasDraft = draftedDates.has(day.date)
                    return (
                      <div
                        key={day.date + day.name}
                        className="rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/14 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono text-muted-foreground">
                              {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-sm font-medium text-foreground leading-snug mt-0.5">{day.name}</p>
                            {day.isBankHoliday && (
                              <span className="inline-block text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-medium mt-1.5">
                                {t.content.bankHoliday}
                              </span>
                            )}
                          </div>
                          <div className="shrink-0 mt-0.5">
                            {hasDraft ? (
                              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[8px]">✓</span>
                                {t.content.generated}
                              </span>
                            ) : orgId ? (
                              <GenerateButton day={day} orgId={orgId} countryCode={countryCode} />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </Animate>

            {/* Taslaklar */}
            <Animate delay={0.12}>
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {t.content.drafts} {draftList.length > 0 && (
                    <span className="normal-case text-primary ml-1 font-mono">{draftList.length}</span>
                  )}
                </h2>

                {draftList.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/12 p-12 text-center">
                    <p className="text-3xl mb-3">✨</p>
                    <p className="text-sm font-medium text-foreground">{t.content.noDrafts}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.content.noDraftsHint}</p>
                  </div>
                )}

                <Stagger className="space-y-3">
                  {draftList.map(renderDraft)}
                </Stagger>
              </section>
            </Animate>
          </div>

          {/* Tehlikeli bölge — toplu silme */}
          {draftList.length > 0 && (
            <Animate delay={0.15}>
              <BulkDeleteButton />
            </Animate>
          )}
        </>
      )}
    </div>
  )
}
