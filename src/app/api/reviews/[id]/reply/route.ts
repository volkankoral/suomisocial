/**
 * POST /api/reviews/[id]/reply
 *
 * action='draft'  → AI ile taslak üret, DB'ye kaydet (reply_status='drafted')
 * action='post'   → Onaylanmış cevabı platforma gönder (reply_status='posted')
 *                   NOT: Platform API'leri henüz GBP kota onayı bekliyor.
 *                        Şu an sadece DB'ye 'posted' yazar; gerçek API çağrısı
 *                        Faz 1'de aktifleşir.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { analyzeSentiment, generateReplyDraft } from '@/lib/ai/reviews'
import { getRegionForCountry, getContentLang } from '@/lib/regions'
import type { BrandContext } from '@/lib/ai/generate-content'
import { agentLimiter } from '@/lib/rate-limit'

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { ok: rlOk, retryAfter } = agentLimiter.check(ip)
  if (!rlOk) {
    return NextResponse.json(
      { error: `Çok fazla istek. ${retryAfter} saniye bekleyin.`, code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } },
    )
  }

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    action: 'draft' | 'post'
    reply_text?: string   // 'post' action'da kullanıcının onayladığı/düzenlediği metin
  }

  if (!body.action) return NextResponse.json({ error: 'action gerekli (draft|post)' }, { status: 400 })

  const supabase = createServiceClient()

  // Yorumu al
  const { data: review, error: reviewErr } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (reviewErr || !review) {
    return NextResponse.json({ error: 'Yorum bulunamadı' }, { status: 404 })
  }

  // ── DRAFT: AI taslak üret ──────────────────────────────────────────────────
  if (body.action === 'draft') {
    // Marka bilgisi
    const { data: brand } = await supabase
      .from('brand_settings')
      .select('business_name, description, tone, products, business_category, content_language')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!brand?.business_name) {
      return NextResponse.json({ error: 'Önce marka ayarlarını tamamla' }, { status: 400 })
    }

    // Dil belirleme
    const countryCode   = await getUserOrgCountry()
    const region        = getRegionForCountry(countryCode)
    const regionLang    = getContentLang(region)
    const brandLang     = (brand as { content_language?: string | null }).content_language
    const lang: string  = (['fi','tr','en','sv'].includes(brandLang ?? '') ? brandLang : regionLang) as string

    // Sentiment (daha önce analiz edilmemişse)
    let sentiment = review.sentiment as 'positive' | 'neutral' | 'negative' | null
    if (!sentiment && review.comment_text) {
      sentiment = await analyzeSentiment(review.comment_text)
      await supabase.from('reviews').update({ sentiment }).eq('id', id)
    }
    sentiment ??= 'neutral'

    // Cevap taslağı üret
    const { reply } = await generateReplyDraft({
      brand:      brand as BrandContext,
      reviewText: review.comment_text ?? '',
      sentiment,
      rating:     review.rating,
      platform:   review.platform as 'google_business' | 'facebook' | 'instagram',
      lang,
    })

    // Kaydet
    const { data: updated, error: updateErr } = await supabase
      .from('reviews')
      .update({ reply_text: reply, reply_status: 'drafted', sentiment })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, review: updated, reply })
  }

  // ── POST: Onaylanan cevabı gönder ─────────────────────────────────────────
  if (body.action === 'post') {
    if (!body.reply_text?.trim()) {
      return NextResponse.json({ error: 'reply_text gerekli' }, { status: 400 })
    }

    // TODO Faz 1: GBP kota onayı gelince gerçek API çağrısı buraya eklenir.
    // Şu an sadece DB'yi günceller.
    const { data: updated, error: updateErr } = await supabase
      .from('reviews')
      .update({
        reply_text:      body.reply_text.trim(),
        reply_status:    'posted',
        reply_posted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, review: updated })
  }

  return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
}
