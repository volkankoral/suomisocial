import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

/**
 * GET  /api/agent/plan          → aktif haftalık plan + kalemleri getir
 * PATCH /api/agent/plan         → kalem durumunu güncelle (approved / rejected)
 */

export async function GET() {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const supabase = createServiceClient()

  // Bu haftanın planı
  const now       = new Date()
  const dayOfWeek = now.getUTCDay()
  const monday    = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setUTCHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().slice(0, 10)

  const { data: plan } = await supabase
    .from('agent_plans')
    .select('*')
    .eq('organization_id', orgId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (!plan) return NextResponse.json({ plan: null, items: [] })

  const { data: items } = await supabase
    .from('agent_plan_items')
    .select(`
      id, scheduled_date, rationale, priority, status,
      content_drafts (
        id, caption_fi, caption_tr, hashtags, image_url,
        special_day_label, category, scheduled_at
      )
    `)
    .eq('plan_id', plan.id)
    .order('scheduled_date', { ascending: true })

  return NextResponse.json({ plan, items: items ?? [] })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { itemId, action } = await req.json() as { itemId: string; action: 'approve' | 'reject' | 'approve_all' }

  const supabase = createServiceClient()

  if (action === 'approve_all') {
    // Tüm ready kalemleri onayla + draft'larını approved yap
    const { data: items } = await supabase
      .from('agent_plan_items')
      .select('id, draft_id')
      .eq('organization_id', orgId)
      .eq('status', 'ready')

    if (items?.length) {
      await supabase
        .from('agent_plan_items')
        .update({ status: 'approved' })
        .in('id', items.map(i => i.id))

      const draftIds = items.map(i => i.draft_id).filter(Boolean) as string[]
      if (draftIds.length) {
        await supabase
          .from('content_drafts')
          .update({ status: 'approved' })
          .in('id', draftIds)
      }

      // Plan'ı done işaretle
      await supabase
        .from('agent_plans')
        .update({ status: 'done', items_approved: items.length })
        .eq('organization_id', orgId)
        .eq('status', 'ready')
    }

    return NextResponse.json({ ok: true, approvedCount: items?.length ?? 0 })
  }

  // Tek kalem güncelle
  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // Org sahipliği doğrula
  const { data: item } = await supabase
    .from('agent_plan_items')
    .select('id, draft_id')
    .eq('id', itemId)
    .eq('organization_id', orgId)
    .single()

  if (!item) return NextResponse.json({ error: 'Kalem bulunamadı' }, { status: 404 })

  await supabase
    .from('agent_plan_items')
    .update({ status: newStatus })
    .eq('id', item.id)

  if (item.draft_id) {
    await supabase
      .from('content_drafts')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', item.draft_id)
  }

  return NextResponse.json({ ok: true })
}
