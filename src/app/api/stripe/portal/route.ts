import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function POST(req: NextRequest) {
  const authClient  = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapınız' }, { status: 401 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: org } = await supabase.from('organizations').select('stripe_customer_id').eq('id', orgId).single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'Henüz Stripe müşterisi yok' }, { status: 400 })
  }

  const lang   = req.cookies.get('NEXT_LOCALE')?.value ?? 'tr'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer:   org.stripe_customer_id,
    return_url: `${appUrl}/${lang}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
