import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { translations, type Lang } from '@/lib/translations'
import { AgentPage } from './_components/AgentPage'

interface Props { params: Promise<{ lang: string }> }

export default async function AgentPageRoute({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'

  const orgId = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/login`)

  const supabase = createServiceClient()

  // Org bilgisi (plan + admin)
  const [{ data: orgRow }, { data: sub }] = await Promise.all([
    supabase.from('organizations').select('is_admin').eq('id', orgId).single(),
    supabase.from('subscriptions')
      .select('plans(slug)')
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const isAdmin  = orgRow?.is_admin === true
  const planSlug = (sub as { plans?: { slug?: string } } | null)?.plans?.slug ?? null
  const isPro    = isAdmin || planSlug === 'pro' || planSlug === 'business'

  // Bu haftanın planını çek
  const now       = new Date()
  const dayOfWeek = now.getUTCDay()
  const monday    = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setUTCHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().slice(0, 10)

  const { data: plan } = await supabase
    .from('agent_plans')
    .select('*')
    .eq('organization_id', orgId)
    .eq('week_start', weekStart)
    .maybeSingle()

  // Supabase returns content_drafts as array even for FK join — we normalise below
  const { data: rawItems } = plan ? await supabase
    .from('agent_plan_items')
    .select(`
      id, scheduled_date, rationale, priority, status, created_at,
      content_drafts (
        id, caption_fi, caption_tr, hashtags, image_url,
        special_day_label, category, scheduled_at
      )
    `)
    .eq('plan_id', plan.id)
    .order('scheduled_date', { ascending: true }) : { data: [] }

  // Flatten: Supabase FK join returns array; take first element or null
  const items = (rawItems ?? []).map(row => ({
    ...row,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content_drafts: Array.isArray((row as any).content_drafts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? ((row as any).content_drafts[0] ?? null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : ((row as any).content_drafts ?? null),
  }))

  const loadingText = translations[lang].common.loading

  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm p-8">{loadingText}</div>}>
      <AgentPage
        lang={lang}
        isPro={isPro}
        plan={plan ?? null}
        items={items ?? []}
      />
    </Suspense>
  )
}
