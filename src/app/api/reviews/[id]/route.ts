/**
 * PATCH /api/reviews/[id]
 * Yorumu güncelle: featured işaretle, reply_status değiştir, reply_text düzenle.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    is_featured?:  boolean
    reply_status?: 'none' | 'drafted' | 'approved' | 'posted' | 'skipped'
    reply_text?:   string
  }

  const allowed = ['is_featured', 'reply_status', 'reply_text'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Yorum bulunamadı' }, { status: 404 })

  return NextResponse.json({ review: data })
}
