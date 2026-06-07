import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function POST(req: NextRequest) {
  const authClient  = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapınız' }, { status: 401 })

  const { planId, billingCycle = 'monthly', lang = 'tr' } = await req.json()
  if (!planId) return NextResponse.json({ error: 'planId zorunlu' }, { status: 400 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 400 })

  const supabase = createServiceClient()

  // Plan bilgisi al
  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()
  if (!plan) return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 })

  // Stripe price ID kontrolü
  const priceId = billingCycle === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly
  if (!priceId) {
    return NextResponse.json({ error: 'Bu plan için Stripe fiyatı henüz ayarlanmamış. Lütfen admin ile iletişime geçin.' }, { status: 400 })
  }

  // Org'un stripe_customer_id'si var mı?
  const { data: org } = await supabase.from('organizations').select('stripe_customer_id, name').eq('id', orgId).single()

  let customerId = org?.stripe_customer_id

  if (!customerId) {
    // Yeni Stripe müşteri oluştur
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name ?? undefined,
      metadata: { org_id: orgId, user_id: user.id },
    })
    customerId = customer.id

    await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/${lang}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/${lang}/billing?canceled=1`,
    subscription_data: {
      metadata: { org_id: orgId, plan_id: planId },
    },
    metadata: { org_id: orgId, plan_id: planId },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
