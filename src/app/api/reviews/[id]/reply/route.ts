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
import { getValidGoogleToken, GBP_V4_API } from '@/lib/google-business'
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

    const replyText = body.reply_text.trim()

    // ── Faz 1: GBP'ye gerçek API çağrısı ──────────────────────────────────
    // Google Business Profile kota onayı (Case 1-0742000041045) geldikten
    // sonra bu blok aktifleşir. Onay olmadan API 403 döner.
    if (review.platform === 'google_business' && review.social_account_id) {
      try {
        const { data: account } = await supabase
          .from('social_accounts')
          .select('id, access_token_vault_id, refresh_token_vault_id, token_expires_at, metadata')
          .eq('id', review.social_account_id)
          .single()

        if (account) {
          const accessToken = await getValidGoogleToken(account)
          if (accessToken) {
            const meta            = account.metadata as {
              account_resource?:  string
              location_resource?: string
            } | null
            const accountResource  = meta?.account_resource  ?? ''
            const locationResource = meta?.location_resource ?? ''

            if (accountResource && locationResource) {
              // PUT https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/reviews/{r}/reply
              const replyUrl = `${GBP_V4_API}/${accountResource}/${locationResource}/reviews/${review.platform_review_id}/reply`
              const gbpRes   = await fetch(replyUrl, {
                method:  'PUT',
                headers: {
                  Authorization:  `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment: replyText }),
              })

              if (!gbpRes.ok) {
                const errBody = await gbpRes.text()
                // 403 = kota onayı bekleniyor → DB'ye yaz, platformda yayınlanmaz
                if (gbpRes.status !== 403) {
                  console.error('[reply/post] GBP API hatası:', gbpRes.status, errBody.slice(0, 200))
                  return NextResponse.json(
                    { error: `GBP API ${gbpRes.status}`, code: 'GBP_ERROR' },
                    { status: 502 },
                  )
                }
                // 403 → sessizce geç, DB'ye kaydet
              }
            }
          }
        }
      } catch (e) {
        // GBP isteği başarısız → DB güncellemesini engelleme
        console.error('[reply/post] GBP reply hatası:', e)
      }
    }

    // ── DB güncelle ────────────────────────────────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from('reviews')
      .update({
        reply_text:      replyText,
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
