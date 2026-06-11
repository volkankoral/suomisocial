import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { translations, type Lang } from '@/lib/translations'
import { AutopilotPage } from './_components/AutopilotPage'
import { SectionTabs } from '../_components/SectionTabs'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t = translations[lang]
  return { title: `${t.autopilot.title} — Occaly` }
}

export default async function AutopilotServerPage({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/login`)

  const orgId = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/onboarding`)

  const serviceClient = createServiceClient()

  // Paralel sorgular
  const [{ data: org }, { data: sub }, { data: settingsRow }, { data: draftsData }] = await Promise.all([
    serviceClient.from('organizations').select('is_admin').eq('id', orgId).single(),
    serviceClient
      .from('subscriptions')
      .select('plans(slug)')
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from('autopilot_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle(),
    serviceClient
      .from('content_drafts')
      .select('id, category, special_day_label, caption_fi, caption_tr, hashtags, image_url, created_at, status')
      .eq('organization_id', orgId)
      .eq('is_autopilot', true)
      .in('status', ['pending'])
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const isAdmin  = !!org?.is_admin
  const planSlug = (sub as { plans?: { slug?: string } } | null)?.plans?.slug
  const isPro    = isAdmin || planSlug === 'pro' || planSlug === 'business'

  return (
    <div className="space-y-6">
      <SectionTabs group="automation" lang={lang} />
      <AutopilotPage
        lang={lang}
        isPro={isPro}
        initialSettings={settingsRow ?? null}
        initialDrafts={draftsData ?? []}
      />
    </div>
  )
}
