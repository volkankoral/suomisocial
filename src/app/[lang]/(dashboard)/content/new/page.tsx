import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSpecialDays, getWeeklyRoutines, getUpcoming } from '@/lib/special-days'
import { getRegionForCountry } from '@/lib/regions'
import { NewContentClient } from './_components/NewContentClient'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; specialDayId?: string; routineId?: string }>
}

export default async function NewContentPage({ params, searchParams }: Props) {
  const { lang } = await params
  const { category, specialDayId, routineId } = await searchParams

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/login`)

  // Marka kontrolü
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('business_name')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!brand?.business_name) {
    redirect(`/${lang}/brand?new=1`)
  }

  // Admin + plan tier kontrolü (FLUX erişimi için)
  const [{ data: orgRow }, { data: sub }] = await Promise.all([
    supabase.from('organizations').select('is_admin').eq('id', orgId).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plans(slug)')
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const isAdmin = orgRow?.is_admin === true
  const planSlug = (sub as { plans?: { slug?: string } } | null)?.plans?.slug ?? null
  const usesFlux = isAdmin || planSlug === 'pro' || planSlug === 'business'

  // Bölgeye göre özel günler
  const countryCode = await getUserOrgCountry()
  const region      = getRegionForCountry(countryCode)
  const upcoming    = getUpcoming(region, 90).slice(0, 10)

  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm p-8">Yükleniyor…</div>}>
      <NewContentClient
        lang={lang}
        initialCategory={(category as 'weekly_routine' | 'special_day' | 'campaign') ?? 'special_day'}
        initialSpecialDayId={specialDayId}
        initialRoutineId={routineId}
        specialDays={getSpecialDays(region)}
        routines={getWeeklyRoutines(region)}
        upcomingDays={upcoming.map(d => ({
          id: d.id,
          name_fi: d.name_fi,
          name_tr: d.name_tr,
          daysUntil: d.daysUntil,
          date: d.resolvedDate.toISOString().slice(0, 10),
        }))}
        isAdmin={usesFlux}
      />
    </Suspense>
  )
}
