/**
 * GET /api/widget/reviews/[orgId]
 *
 * Public endpoint — auth gerektirmez.
 * Widget'ın tükettiği JSON: is_featured=true ve min_rating filtreli yorumlar.
 * CDN cache: 1 saat (stale-while-revalidate: 6 saat).
 *
 * Google ToS uyumu: yorum metni değiştirilmez, yazar + Google link korunur.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

interface Params { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params
  if (!orgId) return NextResponse.json({ error: 'orgId gerekli' }, { status: 400 })

  const supabase = createServiceClient()

  // Ayarları al (yoksa varsayılan: min 4 yıldız, max 10, dark tema)
  const { data: settings } = await supabase
    .from('reputation_settings')
    .select('widget_enabled, widget_min_rating, widget_max_count, widget_theme')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (settings?.widget_enabled === false) {
    return NextResponse.json({ reviews: [], disabled: true })
  }

  const minRating = settings?.widget_min_rating ?? 4
  const maxCount  = Math.min(settings?.widget_max_count ?? 10, 50)  // max 50 güvenlik sınırı
  const theme     = settings?.widget_theme ?? 'dark'

  // Yorumları çek
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, platform, author_name, author_avatar_url, rating, comment_text, review_created_at, metadata')
    .eq('organization_id', orgId)
    .eq('is_featured', true)
    .gte('rating', minRating)
    .not('comment_text', 'is', null)
    .order('review_created_at', { ascending: false })
    .limit(maxCount)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Org adını al (widget başlığı için)
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle()

  const response = NextResponse.json({
    businessName: org?.name ?? '',
    theme,
    reviews: (reviews ?? []).map(r => ({
      id:             r.id,
      platform:       r.platform,
      authorName:     r.author_name,
      authorAvatar:   r.author_avatar_url,
      rating:         r.rating,
      comment:        r.comment_text,
      createdAt:      r.review_created_at,
      // Google ToS: platform'a geri link
      platformUrl:    r.platform === 'google_business'
        ? `https://search.google.com/local/reviews?placeid=${(r.metadata as { place_id?: string })?.place_id ?? ''}`
        : null,
    })),
  })

  // CDN cache: 1 saat fresh, 6 saat stale-while-revalidate
  response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=21600')

  return response
}
