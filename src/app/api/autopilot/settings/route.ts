import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

/**
 * GET  /api/autopilot/settings  — Mevcut autopilot ayarlarını döndür
 * POST /api/autopilot/settings  — Upsert (kaydet/güncelle)
 *
 * Body: { enabled, day_of_week, drafts_per_run }
 */

export async function GET() {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createServiceClient()

  const { data, error } = await supabaseAdmin
    .from('autopilot_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Henüz ayar yok → varsayılanları döndür
  return NextResponse.json(
    data ?? {
      organization_id: orgId,
      enabled:         false,
      day_of_week:     1,
      drafts_per_run:  4,
      last_run_at:     null,
    }
  )
}

export async function POST(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { enabled, day_of_week, drafts_per_run } = body as {
    enabled?: boolean
    day_of_week?: number
    drafts_per_run?: number
  }

  // Validasyon
  if (day_of_week !== undefined && (day_of_week < 0 || day_of_week > 6)) {
    return NextResponse.json({ error: 'day_of_week 0-6 arasında olmalı' }, { status: 400 })
  }
  if (drafts_per_run !== undefined && (drafts_per_run < 1 || drafts_per_run > 7)) {
    return NextResponse.json({ error: 'drafts_per_run 1-7 arasında olmalı' }, { status: 400 })
  }

  // Pro/Business plan kontrolü
  const supabaseAdmin = createServiceClient()
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plans(slug)')
    .eq('organization_id', orgId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Admin bypass
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('is_admin')
    .eq('id', orgId)
    .single()

  const isAdmin  = !!org?.is_admin
  const planSlug = (sub as { plans?: { slug?: string } } | null)?.plans?.slug

  if (!isAdmin && !['pro', 'business'].includes(planSlug ?? '')) {
    return NextResponse.json(
      { error: 'Autopilot özelliği Pro ve Business planlarda kullanılabilir.' },
      { status: 403 }
    )
  }

  const upsertData = {
    organization_id: orgId,
    ...(enabled       !== undefined && { enabled }),
    ...(day_of_week   !== undefined && { day_of_week }),
    ...(drafts_per_run !== undefined && { drafts_per_run }),
  }

  const { data, error } = await supabaseAdmin
    .from('autopilot_settings')
    .upsert(upsertData, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, settings: data })
}
