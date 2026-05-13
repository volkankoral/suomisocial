import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

async function checkAdmin() {
  const supabase = createServiceClient()
  const orgId = await getUserOrgId()
  if (!orgId) return null
  const { data } = await supabase.from('organizations').select('is_admin').eq('id', orgId).single()
  return data?.is_admin ? supabase : null
}

// Manuel plan atama
export async function POST(req: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { orgId, planId, note } = await req.json()
  if (!orgId || !planId) return NextResponse.json({ error: 'orgId ve planId zorunlu' }, { status: 400 })

  // Mevcut aboneliği iptal et
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .eq('status', 'active')

  // Yeni abonelik oluştur
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: orgId,
      plan_id: planId,
      status: 'active',
      billing_cycle: 'monthly',
      is_manual: true,
      manual_note: note || null,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, subscription: data })
}

// Abonelik iptal
export async function DELETE(req: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { orgId } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'orgId zorunlu' }, { status: 400 })

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .in('status', ['active', 'trialing'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
