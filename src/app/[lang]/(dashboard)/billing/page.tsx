import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { BillingClient } from './_components/BillingClient'

interface Props { params: Promise<{ lang: string }> }

export default async function BillingPage({ params }: Props) {
  const { lang } = await params
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

  // Org Stripe müşteri ID
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id, name')
    .eq('id', orgId)
    .single()

  return (
    <BillingClient
      subscription={subscription}
      plans={plans ?? []}
      hasStripeCustomer={!!org?.stripe_customer_id}
    />
  )
}
