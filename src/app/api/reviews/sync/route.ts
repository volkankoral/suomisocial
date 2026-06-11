/**
 * GET /api/reviews/sync
 *
 * Vercel Cron tarafından saatte bir çağrılır (vercel.json'a eklenecek).
 * CRON_SECRET ile korunur.
 *
 * Akış:
 *   1. Bağlı google_business hesaplarını bul
 *   2. Her hesap için GBP API'den yorumları çek (GBP_V4_API/reviews)
 *   3. Yeni yorumları reviews tablosuna kaydet (idempotent: UNIQUE constraint)
 *   4. Yeni negatif yorumlar için email bildirimi gönder
 *
 * NOT: Google'ın review API'si GBP kota onayı (Case 1-0742000041045) gerektirir.
 * Onay gelmeden API 403 döner — bu endpoint onay gelince kendiliğinden çalışır.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getValidGoogleToken, GBP_V4_API } from '@/lib/google-business'
import { analyzeSentiment } from '@/lib/ai/reviews'
import { sendNegativeReviewAlert } from '@/lib/email'

export const maxDuration = 120

interface GbpReview {
  reviewId:     string
  reviewer?:    { displayName?: string; profilePhotoUrl?: string }
  starRating?:  string   // 'ONE'|'TWO'|'THREE'|'FOUR'|'FIVE'
  comment?:     string
  createTime?:  string
}

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Bağlı tüm google_business hesaplarını al
  const { data: accounts, error: accErr } = await supabase
    .from('social_accounts')
    .select('id, organization_id, platform_account_id, metadata, access_token_vault_id, refresh_token_vault_id, token_expires_at, access_token')
    .eq('platform', 'google_business')
    .eq('is_active', true)

  if (accErr) {
    console.error('[reviews/sync] accounts fetch error:', accErr.message)
    return NextResponse.json({ error: accErr.message }, { status: 500 })
  }

  if (!accounts?.length) {
    return NextResponse.json({ ok: true, synced: 0, message: 'Bağlı Google Business hesabı yok' })
  }

  const results: Array<{ orgId: string; locationId: string; newReviews: number; error?: string }> = []

  for (const account of accounts) {
    const orgId      = account.organization_id
    const locationId = account.platform_account_id
    const meta       = account.metadata as { location_resource?: string } | null
    const locationResource = meta?.location_resource ?? `locations/${locationId}`

    try {
      const accessToken = await getValidGoogleToken(account)
      if (!accessToken) {
        results.push({ orgId, locationId, newReviews: 0, error: 'Token alınamadı' })
        continue
      }

      // GBP reviews API
      const reviewsRes = await fetch(
        `${GBP_V4_API}/${locationResource}/reviews?pageSize=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      if (!reviewsRes.ok) {
        const errBody = await reviewsRes.text()
        results.push({ orgId, locationId, newReviews: 0, error: `GBP API ${reviewsRes.status}: ${errBody.slice(0, 100)}` })
        continue
      }

      const reviewsData = await reviewsRes.json()
      const gbpReviews: GbpReview[] = reviewsData.reviews ?? []
      let newCount = 0

      for (const r of gbpReviews) {
        const rating = r.starRating ? STAR_MAP[r.starRating] ?? null : null

        // Sentiment analizi (sadece yorum metni varsa)
        let sentiment: 'positive' | 'neutral' | 'negative' | null = null
        if (r.comment) {
          try { sentiment = await analyzeSentiment(r.comment) } catch { /* devam */ }
        } else if (rating) {
          // Metin yok → yıldıza göre basit sınıflama
          sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative'
        }

        const { error: insertErr } = await supabase
          .from('reviews')
          .upsert(
            {
              organization_id:    orgId,
              social_account_id:  account.id,
              platform:           'google_business',
              platform_review_id: r.reviewId,
              author_name:        r.reviewer?.displayName ?? null,
              author_avatar_url:  r.reviewer?.profilePhotoUrl ?? null,
              rating,
              comment_text:       r.comment ?? null,
              sentiment,
              review_created_at:  r.createTime ?? null,
              metadata:           { location_resource: locationResource },
            },
            { onConflict: 'platform,platform_review_id', ignoreDuplicates: false },
          )

        if (!insertErr) newCount++

        // Yeni negatif yorum → bildirim gönder
        if (!insertErr && sentiment === 'negative') {
          // Org email'ini al
          try {
            const { data: settings } = await supabase
              .from('reputation_settings')
              .select('notify_email')
              .eq('organization_id', orgId)
              .maybeSingle()

            // Bildirim adresi: reputation_settings.notify_email → yoksa org owner email
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
                platform:   'Google Business',
                authorName: r.reviewer?.displayName ?? 'Anonim',
                rating,
                comment:    r.comment ?? '',
                reviewUrl:  `https://occaly.com/reviews?id=${r.reviewId}`,
              }).catch((e: unknown) => console.error('[reviews/sync] bildirim email hatası:', e))
            }
          } catch { /* bildirim başarısız → sync'i durdurma */ }
        }
      }

      results.push({ orgId, locationId, newReviews: newCount })

    } catch (err) {
      console.error('[reviews/sync] hesap hatası:', err)
      results.push({ orgId, locationId, newReviews: 0, error: err instanceof Error ? err.message : 'Bilinmeyen hata' })
    }
  }

  const totalNew = results.reduce((s, r) => s + r.newReviews, 0)
  return NextResponse.json({ ok: true, accounts: results.length, newReviews: totalNew, results })
}
