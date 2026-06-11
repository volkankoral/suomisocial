import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { translations, type Lang } from '@/lib/translations'
import { ReputationSettingsPage } from './_components/ReputationSettingsPage'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t = translations[lang]
  return { title: `${t.reviews.settingsTitle} — Occaly` }
}

export default async function ReviewsSettingsServerPage({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/login`)

  const orgId = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/onboarding`)

  const serviceClient = createServiceClient()
  const { data: settings } = await serviceClient
    .from('reputation_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  return (
    <ReputationSettingsPage
      lang={lang}
      initialSettings={settings ?? null}
    />
  )
}
