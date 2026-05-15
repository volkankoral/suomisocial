import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { FI_SPECIAL_DAYS, FI_WEEKLY_ROUTINES, upcomingSpecialDays } from '@/lib/fi-special-days'
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

  // Önümüzdeki özel günler (özel gün seçenekleri için)
  const upcoming = upcomingSpecialDays(90).slice(0, 10)

  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm p-8">Yükleniyor…</div>}>
      <NewContentClient
        lang={lang}
        initialCategory={(category as 'weekly_routine' | 'special_day' | 'campaign') ?? 'special_day'}
        initialSpecialDayId={specialDayId}
        initialRoutineId={routineId}
        specialDays={FI_SPECIAL_DAYS}
        routines={FI_WEEKLY_ROUTINES}
        upcomingDays={upcoming.map(d => ({
          id: d.id,
          name_fi: d.name_fi,
          name_tr: d.name_tr,
          daysUntil: d.daysUntil,
          date: d.resolvedDate.toISOString().slice(0, 10),
        }))}
      />
    </Suspense>
  )
}
