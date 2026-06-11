/**
 * GET /api/reviews
 * Dashboard yorum listesi — platform, sentiment, reply_status, page filtreleri.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function GET(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const platform    = searchParams.get('platform')      // google_business | facebook | instagram
  const sentiment   = searchParams.get('sentiment')     // positive | neutral | negative
  const replyStatus = searchParams.get('reply_status')  // none | drafted | approved | posted | skipped
  const page        = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit       = 20
  const offset      = (page - 1) * limit

  const supabase = createServiceClient()

  let query = supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('review_created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (platform)    query = query.eq('platform',     platform)
  if (sentiment)   query = query.eq('sentiment',    sentiment)
  if (replyStatus) query = query.eq('reply_status', replyStatus)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ reviews: data ?? [], total: count ?? 0, page, limit })
}
