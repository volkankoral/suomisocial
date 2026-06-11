/**
 * Meta (Facebook / Instagram) Webhook Handler
 *
 * GET  /api/webhooks/meta  — webhook doğrulama (Meta challenge)
 * POST /api/webhooks/meta  — review/rating event'leri işle
 *
 * Faz 2: Meta App Review onayı bekleniyor (business verification gerekli).
 * Bu endpoint hazır; onay gelince Meta Developer Portal'dan
 * Webhook URL olarak https://occaly.com/api/webhooks/meta ayarlanacak.
 *
 * Meta'dan gelecek event'ler:
 *   object: "page"
 *   field:  "ratings"
 *
 * Env vars gerekli:
 *   META_APP_SECRET          — X-Hub-Signature-256 doğrulama
 *   META_WEBHOOK_VERIFY_TOKEN — GET challenge doğrulama (istediğin string)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'
import { createServiceClient }       from '@/lib/supabase/service'
import { analyzeSentiment }          from '@/lib/ai/reviews'
import { sendNegativeReviewAlert }   from '@/lib/email'

export const maxDuration = 60

// ─── GET: Meta webhook challenge ─────────────────────────────────────────────

export function GET(req: NextRequest) {
  const sp          = req.nextUrl.searchParams
  const mode        = sp.get('hub.mode')
  const token       = sp.get('hub.verify_token')
  const challenge   = sp.get('hub.challenge')
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST: Webhook payload işle ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) {
    console.error('[meta-webhook] META_APP_SECRET eksik')
    return NextResponse.json({ error: 'Yapılandırma hatası' }, { status: 500 })
  }

  // X-Hub-Signature-256 doğrula
  const rawBody  = await req.text()
  const sigHeader = req.headers.get('x-hub-signature-256') ?? ''
  const expected  = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`

  if (sigHeader !== expected) {
    return NextResponse.json({ error: 'İmza geçersiz' }, { status: 401 })
  }

  let payload: MetaWebhookPayload
  try { payload = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'JSON parse hatası' }, { status: 400 }) }

  // Sadece "ratings" değişikliklerini işle
  if (payload.object !== 'page') {
    return NextResponse.json({ ok: true, skipped: 'not a page event' })
  }

  const supabase = createServiceClient()

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id
    if (!pageId) continue

    // Facebook sayfasına ait organizasyonu bul
    const { data: account } = await supabase
      .from('social_accounts')
      .select('organization_id, id')
      .eq('platform', 'facebook')
      .eq('platform_account_id', pageId)
      .eq('is_active', true)
      .maybeSingle()

    if (!account) continue

    const orgId = account.organization_id

    for (const change of entry.changes ?? []) {
      if (change.field !== 'ratings') continue
      await handleRatingChange(supabase, orgId, account.id, pageId, change.value)
    }
  }

  return NextResponse.json({ ok: true })
}

// ─── Rating değişikliğini işle ────────────────────────────────────────────────

async function handleRatingChange(
  supabase:        ReturnType<typeof createServiceClient>,
  orgId:           string,
  socialAccountId: string,
  pageId:          string,
  value:           MetaRatingValue,
) {
  const reviewId   = value.open_graph_story?.id ?? null
  const rating     = value.rating?.has_rating ? (value.rating.rating ?? null) : null
  const reviewText = value.review_text ?? null
  const authorName = value.reviewer?.name ?? null
  const createdAt  = value.created_time
    ? new Date(value.created_time * 1000).toISOString()
    : new Date().toISOString()

  // platform_review_id yoksa unique değer oluştur
  const platformReviewId = reviewId ?? `fb_${pageId}_${value.created_time ?? Date.now()}`

  // Sentiment analizi
  let sentiment: 'positive' | 'neutral' | 'negative' | null = null
  if (reviewText) {
    try { sentiment = await analyzeSentiment(reviewText) } catch { /* devam */ }
  } else if (rating !== null) {
    sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative'
  }

  // DB'ye kaydet (idempotent)
  const { error: insertErr } = await supabase
    .from('reviews')
    .upsert(
      {
        organization_id:    orgId,
        social_account_id:  socialAccountId,
        platform:           'facebook',
        platform_review_id: platformReviewId,
        author_name:        authorName,
        author_avatar_url:  null,
        rating,
        comment_text:       reviewText,
        sentiment,
        review_created_at:  createdAt,
        metadata:           { page_id: pageId, og_story_id: reviewId },
      },
      { onConflict: 'platform,platform_review_id', ignoreDuplicates: false },
    )

  if (insertErr) {
    console.error('[meta-webhook] review insert hatası:', insertErr.message)
    return
  }

  // Olumsuz yorum → bildirim
  if (sentiment === 'negative') {
    try {
      const { data: settings } = await supabase
        .from('reputation_settings')
        .select('notify_email')
        .eq('organization_id', orgId)
        .maybeSingle()

      let notifyEmail = settings?.notify_email ?? null
      if (!notifyEmail) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (member?.user_id) {
          const { data: { user } } = await supabase.auth.admin.getUserById(member.user_id)
          notifyEmail = user?.email ?? null
        }
      }

      if (notifyEmail) {
        sendNegativeReviewAlert({
          to:         notifyEmail,
          platform:   'Facebook',
          authorName: authorName ?? 'Anonim',
          rating,
          comment:    reviewText ?? '',
          reviewUrl:  `https://occaly.com/reviews?platform=facebook`,
        }).catch((e: unknown) =>
          console.error('[meta-webhook] bildirim email hatası:', e),
        )
      }
    } catch { /* bildirim başarısız → webhook'u durdurma */ }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaWebhookPayload {
  object: string
  entry?: MetaEntry[]
}

interface MetaEntry {
  id:      string
  time?:   number
  changes?: MetaChange[]
}

interface MetaChange {
  field: string
  value: MetaRatingValue
}

interface MetaRatingValue {
  rating?:           { has_rating: boolean; rating?: number }
  review_text?:      string
  reviewer?:         { name?: string }
  created_time?:     number
  open_graph_story?: { id?: string }
}
