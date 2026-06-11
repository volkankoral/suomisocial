import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { BillingClient } from './_components/BillingClient'
import { translations, type Lang } from '@/lib/translations'
import { SectionTabs } from '../_components/SectionTabs'

interface Props { params: Promise<{ lang: string }> }

export default async function BillingPage({ params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const supabase  = createServiceClient()
  const orgId     = await getUserOrgId()
  if (!orgId) redirect(`/${lang}/login`)

  // Mevcut abonelik
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('organization_id', orgId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Tüm aktif planlar
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  // Org Stripe müşteri ID + kredi bakiyesi
  const [{ data: org }, { data: creditRow }] = await Promise.all([
    supabase.from('organizations').select('stripe_customer_id, name').eq('id', orgId).single(),
    supabase.from('credit_balance').select('balance').eq('organization_id', orgId).maybeSingle(),
  ])

  const loadingText = translations[lang].billing.loading

  return (
    <div className="space-y-6">
      <SectionTabs group="settings" lang={lang} />
      <Suspense fallback={<div className="text-muted-foreground text-sm p-8">{loadingText}</div>}>
        <BillingClient
          subscription={subscription}
          plans={plans ?? []}
          hasStripeCustomer={!!org?.stripe_customer_id}
          creditBalance={creditRow?.balance ?? 0}
        />
      </Suspense>
    </div>
  )
}
