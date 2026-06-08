import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

/**
 * GET  /api/stripe/credits  — Kredi paketleri + mevcut bakiye
 * POST /api/stripe/credits  — Seçilen paket için Stripe checkout başlat
 *
 * Body: { packageId: 'starter' | 'growth' | 'power', lang?: string }
 */

export const CREDIT_PACKAGES = [
  {
    id:          'starter',
    credits:     50,
    price:       1900,   // €19.00 (kuruş cinsinden)
    label:       'Starter Pack',
    description: '50 AI içerik kredisi',
    popular:     false,
  },
  {
    id:          'growth',
    credits:     150,
    price:       4900,   // €49.00
    label:       'Growth Pack',
    description: '150 AI içerik kredisi',
    popular:     true,
  },
  {
    id:          'power',
    credits:     500,
    price:       14900,  // €149.00
    label:       'Power Pack',
    description: '500 AI içerik kredisi',
    popular:     false,
  },
]

export async function GET() {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: balance } = await supabase
    .from('credit_balance')
    .select('balance, total_purchased')
    .eq('organization_id', orgId)
    .maybeSingle()

  return NextResponse.json({
    packages: CREDIT_PACKAGES,
    balance:  balance?.balance ?? 0,
    total_purchased: balance?.total_purchased ?? 0,
  })
}

export async function POST(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { packageId, lang = 'tr' } = body as { packageId: string; lang?: string }

  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
  if (!pkg) return NextResponse.json({ error: 'Geçersiz paket' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://occaly.com'

  const session = await stripe.checkout.sessions.create({
    mode:        'payment',  // One-time ödeme (abonelik değil)
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency:     'eur',
          unit_amount:  pkg.price,
          product_data: {
            name:        pkg.label,
            description: pkg.description,
            metadata: {
              credits:    String(pkg.credits),
              package_id: pkg.id,
            },
          },
        },
      },
    ],
    metadata: {
      type:       'credit_topup',   // Webhook'ta ayırt etmek için
      org_id:     orgId,
      package_id: pkg.id,
      credits:    String(pkg.credits),
    },
    success_url: `${appUrl}/${lang}/billing?credits=success&amount=${pkg.credits}`,
    cancel_url:  `${appUrl}/${lang}/billing?credits=canceled`,
  })

  return NextResponse.json({ url: session.url })
}
