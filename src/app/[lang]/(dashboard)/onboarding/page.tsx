import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './_components/OnboardingWizard'

interface Props { params: Promise<{ lang: string }> }

export default async function OnboardingPage({ params }: Props) {
  const { lang } = await params
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect(`/${lang}/login`)

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/login`)

  // Brand settings var mı?
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('id, business_name, tone, logo_url')
    .eq('organization_id', orgId)
    .maybeSingle()

  // Zaten setup yapılmışsa dashboard'a yönlendir
  if (brand?.business_name && brand?.tone) {
    redirect(`/${lang}/dashboard`)
  }

  // Aktif planlar (billing step için)
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, price_monthly, price_yearly, features, is_featured')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  // Mevcut abonelik
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status, plans(name)')
    .eq('organization_id', orgId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <OnboardingWizard
          lang={lang}
          orgId={orgId}
          existingBrand={brand}
          plans={plans ?? []}
          hasSubscription={!!subscription}
        />
      </div>
    </div>
  )
}
