/**
 * GET  /api/reviews/settings  — reputation_settings'i getir
 * PATCH /api/reviews/settings  — upsert reputation_settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function GET() {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('reputation_settings')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ settings: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    notify_email?:     string | null
    widget_enabled?:   boolean
    widget_min_rating?: number
    widget_max_count?:  number
    widget_theme?:      'dark' | 'light'
  }

  // Sadece izin verilen alanları al
  const patch: Record<string, unknown> = { organization_id: orgId }
  if ('notify_email'     in body) patch.notify_email     = body.notify_email     ?? null
  if ('widget_enabled'   in body) patch.widget_enabled   = body.widget_enabled
  if ('widget_min_rating'in body) patch.widget_min_rating = Math.min(5, Math.max(1, Number(body.widget_min_rating)))
  if ('widget_max_count' in body) patch.widget_max_count  = Math.min(50, Math.max(1, Number(body.widget_max_count)))
  if ('widget_theme'     in body) patch.widget_theme      = body.widget_theme === 'light' ? 'light' : 'dark'

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('reputation_settings')
    .upsert(patch, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, settings: data })
}
