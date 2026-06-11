import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { translations, type Lang } from '@/lib/translations'
import { ReviewsPage } from './_components/ReviewsPage'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<{
    platform?: string
    sentiment?: string
    status?: string
    page?: string
  }>
}

export async function generateMetadata({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t = translations[lang]
  return { title: `${t.reviews.title} — Occaly` }
}

const PAGE_SIZE = 20

export default async function ReviewsServerPage({ params, searchParams }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/login`)

  const orgId = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/onboarding`)

  const sp       = await searchParams
  const platform = sp.platform  ?? 'all'
  const sentiment = sp.sentiment ?? 'all'
  const status   = sp.status    ?? 'all'
  const page     = Math.max(1, Number(sp.page ?? '1'))
  const offset   = (page - 1) * PAGE_SIZE

  const serviceClient = createServiceClient()

  // Build query
  let query = serviceClient
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('review_created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (platform !== 'all')  query = query.eq('platform', platform)
  if (sentiment !== 'all') query = query.eq('sentiment', sentiment)
  if (status !== 'all')    query = query.eq('reply_status', status)

  const { data: reviews, count } = await query

  // Reputation settings (for notify_email config link)
  const { data: settings } = await serviceClient
    .from('reputation_settings')
    .select('widget_enabled, widget_min_rating, notify_email')
    .eq('organization_id', orgId)
    .maybeSingle()

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <ReviewsPage
      lang={lang}
      orgId={orgId}
      initialReviews={reviews ?? []}
      totalCount={count ?? 0}
      totalPages={totalPages}
      currentPage={page}
      filters={{ platform, sentiment, status }}
      settings={settings ?? null}
    />
  )
}
