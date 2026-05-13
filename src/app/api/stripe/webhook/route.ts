import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import Stripe from 'stripe'

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const reader = req.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function POST(req: NextRequest) {
  const rawBody = await getRawBody(req)
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature hatası:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const orgId  = session.metadata?.org_id
        const planId = session.metadata?.plan_id
        const subId  = session.subscription as string
        if (!orgId || !planId || !subId) break

        // Stripe abonelik detayını al
        const sub = await stripe.subscriptions.retrieve(subId) as unknown as Stripe.Subscription

        // Mevcut aktif abonelikleri iptal et
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('organization_id', orgId)
          .eq('status', 'active')

        // Yeni abonelik oluştur
        await supabase.from('subscriptions').insert({
          organization_id:     orgId,
          plan_id:             planId,
          status:              sub.status,
          billing_cycle:       sub.items.data[0]?.plan.interval === 'year' ? 'yearly' : 'monthly',
          stripe_subscription_id: subId,
          current_period_start: new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000).toISOString(),
          current_period_end:   new Date((sub as unknown as { current_period_end: number }).current_period_end   * 1000).toISOString(),
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.org_id
        if (!orgId) break

        const subPeriods = sub as unknown as { current_period_start: number; current_period_end: number }
        await supabase
          .from('subscriptions')
          .update({
            status:              sub.status,
            current_period_start: new Date(subPeriods.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(subPeriods.current_period_end   * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subId = (invoice as any).subscription as string | undefined
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook işleme hatası:', err)
    return NextResponse.json({ error: 'Webhook işleme hatası' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
