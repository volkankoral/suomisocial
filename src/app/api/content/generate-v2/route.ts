import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { generateLimiter } from '@/lib/rate-limit'
import {
  generateSpecialDayContent,
  generateRoutineContent,
  generateCampaignContent,
  type BrandContext,
} from '@/lib/ai/generate-content'
import { generateImage, type ImageAspect } from '@/lib/ai/generate-image'
import { addTextOverlay } from '@/lib/ai/add-text-overlay'
import { findSpecialDay, findRoutine, getResolvedSpecialDays } from '@/lib/special-days'
import { getRegionForCountry, getContentLang, type ContentLang } from '@/lib/regions'

/**
 * Yeni içerik üretim endpoint'i — 3 kategori:
 *   { category: 'weekly_routine', routineId: 'hyvaa-viikonloppua', scheduledAt?: ISO }
 *   { category: 'special_day',    specialDayId: 'vappu',           scheduledAt?: ISO }
 *   { category: 'campaign',       brief: 'Bu hafta 2 al 1 öde',    scheduledAt?: ISO }
 *
 * Opsiyonel: aspect ('square' | 'portrait' | 'story'), platforms (string[])
 */

// FLUX + Groq üretimi 10sn'yi aşabilir — Vercel fonksiyon süresini uzat
export const maxDuration = 60

interface Body {
  category: 'weekly_routine' | 'special_day' | 'campaign'
  routineId?: string
  specialDayId?: string
  brief?: string
  aspect?: ImageAspect
  platforms?: string[]
  scheduledAt?: string | null
  userMediaUrl?: string | null
  userMediaType?: 'image' | 'video' | null
}

export async function POST(req: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const { ok: rlOk, retryAfter } = generateLimiter.check(ip)
  if (!rlOk) {
    return NextResponse.json(
      { error: `Çok fazla istek. Lütfen ${retryAfter} saniye bekleyin.`, code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter ?? 60) },
      }
    )
  }

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const supabaseAdmin = createServiceClient()

  // ──────────────────────────────────────────────────────────
  // KOTA KONTROLÜ — aktif abonelik + aylık limit
  // ──────────────────────────────────────────────────────────
  const { data: orgRow } = await supabaseAdmin
    .from('organizations')
    .select('is_admin')
    .eq('id', orgId)
    .single()
  const isAdmin = orgRow?.is_admin === true

  // Plan bilgisi — admin'ler için de slug lazım (FLUX kararı için)
  let planSlug: string | null = null

  if (!isAdmin) {
    // Aktif abonelik ve plan limitini al
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id, plans(slug, limits)')
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!sub) {
      return NextResponse.json(
        { error: 'Aktif abonelik bulunamadı. Lütfen bir plan seçin.', code: 'NO_SUBSCRIPTION' },
        { status: 403 }
      )
    }

    const subPlans = (sub as { plans?: { slug?: string; limits?: Record<string, number> } }).plans
    planSlug = subPlans?.slug ?? null

    // Plan limitini oku (limits.ai_credits — -1 = sınırsız)
    const planLimits = subPlans?.limits ?? {}
    const monthlyLimit: number = planLimits['ai_credits'] ?? 20

    if (monthlyLimit !== -1) {
      // Bu ayın kullanımını kontrol et
      const periodStart = new Date()
      periodStart.setUTCDate(1)
      periodStart.setUTCHours(0, 0, 0, 0)
      const periodStartStr = periodStart.toISOString().slice(0, 10)

      const { data: usage } = await supabaseAdmin
        .from('usage_records')
        .select('content_generated')
        .eq('organization_id', orgId)
        .eq('period_start', periodStartStr)
        .maybeSingle()

      const used = usage?.content_generated ?? 0

      if (used >= monthlyLimit) {
        return NextResponse.json(
          {
            error: `Aylık ${monthlyLimit} içerik limitine ulaştınız (${used}/${monthlyLimit}). Planınızı yükseltin.`,
            code: 'QUOTA_EXCEEDED',
            used,
            limit: monthlyLimit,
          },
          { status: 429 }
        )
      }
    }
  }

  const body = await req.json() as Body
  const aspect = body.aspect ?? 'square'

  // Bölge (lang'i brand'den sonra hesaplayacağız)
  const countryCode = await getUserOrgCountry()
  const region      = getRegionForCountry(countryCode)

  const supabase = supabaseAdmin

  // Brand bilgisi al
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('business_name, description, tone, products, overlay_text, content_language')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!brand?.business_name) {
    return NextResponse.json({ error: 'Önce marka ayarlarını tamamla (/brand)' }, { status: 400 })
  }

  const brandCtx: BrandContext = brand

  // İçerik dilini belirle: brand'deki override > bölge varsayılanı
  const regionDefault = getContentLang(region)
  const brandLang     = (brand as { content_language?: string | null }).content_language
  const lang: ContentLang = (['fi', 'tr', 'en'].includes(brandLang ?? '') ? brandLang : regionDefault) as ContentLang

  try {
    let generated
    let dayDate: string
    let dayLabel: string
    let specialDayId: string | null = null

    if (body.category === 'special_day') {
      if (!body.specialDayId) return NextResponse.json({ error: 'specialDayId zorunlu' }, { status: 400 })

      const day = findSpecialDay(region, body.specialDayId)
      if (!day) return NextResponse.json({ error: 'Özel gün bulunamadı' }, { status: 404 })

      // Gerçek tarihi çöz
      const year = new Date().getUTCFullYear()
      const resolved = getResolvedSpecialDays(region, year).find(d => d.id === day.id)!
      dayDate = resolved.resolvedDate.toISOString().slice(0, 10)
      dayLabel = day.name_fi
      specialDayId = day.id

      generated = await generateSpecialDayContent(brandCtx, {
        date: dayDate,
        name_fi: day.name_fi,
        context_fi: day.context_fi,
        visual_hint: day.visual_hint,
      }, lang)
    }
    else if (body.category === 'weekly_routine') {
      const routine = body.routineId ? findRoutine(region, body.routineId) : undefined
      if (!routine) return NextResponse.json({ error: 'Rutin bulunamadı' }, { status: 404 })

      dayDate = (body.scheduledAt ?? new Date().toISOString()).slice(0, 10)
      dayLabel = routine.name_fi

      generated = await generateRoutineContent(brandCtx, {
        name_fi: routine.name_fi,
        context_fi: routine.context_fi,
        visual_hint: routine.visual_hint,
      }, lang)
    }
    else if (body.category === 'campaign') {
      if (!body.brief) return NextResponse.json({ error: 'Kampanya açıklaması zorunlu' }, { status: 400 })

      dayDate = (body.scheduledAt ?? new Date().toISOString()).slice(0, 10)
      dayLabel = 'Kampanya'

      generated = await generateCampaignContent(brandCtx, {
        brief: body.brief,
      }, lang)
    }
    else {
      return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 })
    }

    // Görsel: kullanıcı yüklediyse onu kullan, yoksa AI üret
    let imageUrl: string | null = null
    let imageProvider: string | null = null

    if (body.userMediaUrl) {
      // Kullanıcının yüklediği medyayı kullan — AI görsel üretmesin
      imageUrl = body.userMediaUrl
      imageProvider = 'user-upload'
    } else {
      // FLUX: admin veya Pro/Business plan → yüksek kalite
      // Starter / abonelik yok → Pollinations (ücretsiz)
      const useFLUX = (isAdmin || planSlug === 'pro' || planSlug === 'business') && !!process.env.REPLICATE_API_TOKEN
      const provider = useFLUX ? 'flux' : 'pollinations'
      const image = await generateImage(generated.image_prompt, { aspect, provider })
      imageUrl = image.url
      imageProvider = image.provider
    }

    // Metin overlay — video değilse uygula (brand overlay_text false yapabilir)
    const overlayEnabled = (brand as { overlay_text?: boolean }).overlay_text !== false
    const isVideo = body.userMediaType === 'video'

    if (imageUrl && overlayEnabled && !isVideo) {
      try {
        imageUrl = await addTextOverlay({
          orgId,
          businessName: brand.business_name,
          label:        dayLabel,
          imageUrl,
        })
      } catch (overlayErr) {
        // Overlay başarısız olursa orijinal URL ile devam et
        console.error('Overlay hatası (devam ediliyor):', overlayErr)
      }
    }

    // Draft kaydet
    const { data: draft, error } = await supabase
      .from('content_drafts')
      .insert({
        organization_id:           orgId,
        category:                  body.category,
        special_day_id:            specialDayId,
        special_day_date:          dayDate,
        special_day_label:         dayLabel,
        special_day_label_tr:      dayLabel,
        caption_fi:                generated.caption_fi,
        caption_tr:                generated.caption_tr,
        hashtags:                  generated.hashtags,
        image_url:                 imageUrl,
        image_prompt:              body.userMediaUrl ? null : generated.image_prompt,
        user_media_url:            body.userMediaUrl ?? null,
        user_media_type:           body.userMediaType ?? null,
        platforms:                 body.platforms ?? ['instagram', 'facebook'],
        campaign_brief:            body.category === 'campaign' ? body.brief : null,
        scheduled_at:              body.scheduledAt ?? null,
        status:                    'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ──────────────────────────────────────────────────────────
    // KULLANIM SAYACI — başarılı üretimde artır (admin hariç)
    // ──────────────────────────────────────────────────────────
    if (!isAdmin) {
      const periodStart = new Date()
      periodStart.setUTCDate(1)
      periodStart.setUTCHours(0, 0, 0, 0)
      const periodStartStr = periodStart.toISOString().slice(0, 10)

      await supabaseAdmin.rpc('increment_usage', {
        p_org_id: orgId,
        p_period_start: periodStartStr,
      })
    }

    return NextResponse.json({
      ok: true,
      draft,
      imageProvider,
    })

  } catch (err) {
    console.error('İçerik üretimi hatası:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    }, { status: 500 })
  }
}
