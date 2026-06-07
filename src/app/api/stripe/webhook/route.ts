import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import {
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  sendSubscriptionCanceledEmail,
  sendPaymentFailedEmail,
} from '@/lib/email'
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

/** Org'un email ve marka adını çek */
async function getOrgInfo(supabase: ReturnType<typeof createServiceClient>, orgId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .limit(1)

  let email: string | null = null
  if (members?.[0]?.user_id) {
    const { data: { user } } = await supabase.auth.admin.getUserById(members[0].user_id)
    email = user?.email ?? null
  }

  return { name: org?.name ?? '', email }
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

  // ── Idempotency — aynı event iki kez işlenmesin ──────────────────────────
  // webhook_events tablosu yoksa bu blok sessizce geçer
  try {
    const { error: insertErr } = await supabase
      .from('webhook_events')
      .insert({ event_id: event.id, event_type: event.type })

    if (insertErr?.code === '23505') {
      // Unique violation — event zaten işlenmiş
      console.log(`Duplicate webhook event ignored: ${event.id}`)
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch {
    // Tablo henüz yoksa devam et (migration sonrası aktif olur)
  }

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
        const subPeriods = sub as unknown as { current_period_start: number; current_period_end: number }

        // Mevcut aktif abonelikleri iptal et
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('organization_id', orgId)
          .eq('status', 'active')

        // Yeni abonelik oluştur
        await supabase.from('subscriptions').insert({
          organization_id:      orgId,
          plan_id:              planId,
          status:               sub.status,
          billing_cycle:        sub.items.data[0]?.plan.interval === 'year' ? 'yearly' : 'monthly',
          stripe_subscription_id: subId,
          current_period_start: new Date(subPeriods.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(subPeriods.current_period_end   * 1000).toISOString(),
        })

        // Email — plan bilgisi çek
        const { data: plan } = await supabase
          .from('plans')
          .select('name, price_monthly')
          .eq('id', planId)
          .single()

        const { name: orgName, email } = await getOrgInfo(supabase, orgId)

        // İlk abonelik → hoş geldin + ödeme emaili
        const nextBilling = new Date(subPeriods.current_period_end * 1000)
          .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        if (email) {
          // Hoş geldin emaili (fire-and-forget, hata email gönderimini engellesin)
          sendWelcomeEmail({ to: email, businessName: orgName }).catch(console.error)

          sendPaymentSuccessEmail({
            to: email,
            businessName: orgName,
            planName: plan?.name ?? 'Starter',
            amount: `€${plan?.price_monthly ?? '–'}/month`,
            nextBillingDate: nextBilling,
          }).catch(console.error)
        }
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
            status:               sub.status,
            current_period_start: new Date(subPeriods.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(subPeriods.current_period_end   * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.org_id

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)

        // İptal emaili
        if (orgId) {
          const subPeriods = sub as unknown as { current_period_end: number }
          const { name: orgName, email } = await getOrgInfo(supabase, orgId)

          // Hangi planı bulduk?
          const { data: dbSub } = await supabase
            .from('subscriptions')
            .select('plans(name)')
            .eq('stripe_subscription_id', sub.id)
            .maybeSingle()
          const planName = (dbSub as { plans?: { name?: string } } | null)?.plans?.name ?? 'your plan'

          const accessUntil = new Date(subPeriods.current_period_end * 1000)
            .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

          if (email) {
            sendSubscriptionCanceledEmail({
              to: email,
              businessName: orgName,
              planName,
              accessUntil,
            }).catch(console.error)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subId = (invoice as any).subscription as string | undefined
        if (!subId) break

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subId)

        // Ödeme hatası emaili
        const { data: dbSub } = await supabase
          .from('subscriptions')
          .select('organization_id, plans(name)')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        if (dbSub?.organization_id) {
          const { name: orgName, email } = await getOrgInfo(supabase, dbSub.organization_id)
          const planName = (dbSub as { plans?: { name?: string } }).plans?.name ?? 'your plan'

          if (email) {
            sendPaymentFailedEmail({
              to: email,
              businessName: orgName,
              planName,
            }).catch(console.error)
          }
        }
        break
      }

      // Yenileme ödemeleri — ödeme başarısı emaili gönder
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subId = (invoice as any).subscription as string | undefined
        // İlk ödeme checkout.session.completed'dan gelir, yenileme buradan
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!subId || (invoice as any).billing_reason === 'subscription_create') break

        const { data: dbSub } = await supabase
          .from('subscriptions')
          .select('organization_id, plans(name, price_monthly)')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        if (dbSub?.organization_id) {
          const { name: orgName, email } = await getOrgInfo(supabase, dbSub.organization_id)
          const plan = (dbSub as { plans?: { name?: string; price_monthly?: number } }).plans

          // Abonelik dönemini güncelle
          const stripeSub = await stripe.subscriptions.retrieve(subId)
          const sp = stripeSub as unknown as { current_period_start: number; current_period_end: number }
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(sp.current_period_start * 1000).toISOString(),
              current_period_end:   new Date(sp.current_period_end   * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subId)

          const nextBilling = new Date(sp.current_period_end * 1000)
            .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

          if (email) {
            sendPaymentSuccessEmail({
              to: email,
              businessName: orgName,
              planName: plan?.name ?? 'Starter',
              amount: `€${plan?.price_monthly ?? '–'}/month`,
              nextBillingDate: nextBilling,
            }).catch(console.error)
          }
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
