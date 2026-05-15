import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import {
  generateSpecialDayContent,
  generateRoutineContent,
  generateCampaignContent,
  type BrandContext,
} from '@/lib/ai/generate-content'
import { generateImage, type ImageAspect } from '@/lib/ai/generate-image'
import { FI_SPECIAL_DAYS, FI_WEEKLY_ROUTINES, resolveSpecialDays } from '@/lib/fi-special-days'

/**
 * Yeni içerik üretim endpoint'i — 3 kategori:
 *   { category: 'weekly_routine', routineId: 'hyvaa-viikonloppua', scheduledAt?: ISO }
 *   { category: 'special_day',    specialDayId: 'vappu',           scheduledAt?: ISO }
 *   { category: 'campaign',       brief: 'Bu hafta 2 al 1 öde',    scheduledAt?: ISO }
 *
 * Opsiyonel: aspect ('square' | 'portrait' | 'story'), platforms (string[])
 */

interface Body {
  category: 'weekly_routine' | 'special_day' | 'campaign'
  routineId?: string
  specialDayId?: string
  brief?: string
  aspect?: ImageAspect
  platforms?: string[]
  scheduledAt?: string | null
}

export async function POST(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json() as Body
  const aspect = body.aspect ?? 'square'

  const supabase = createServiceClient()

  // Brand bilgisi al
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('business_name, description, tone, products, business_type')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!brand?.business_name) {
    return NextResponse.json({ error: 'Önce marka ayarlarını tamamla (/brand)' }, { status: 400 })
  }

  const brandCtx: BrandContext = brand

  try {
    let generated
    let dayDate: string
    let dayLabel: string
    let specialDayId: string | null = null

    if (body.category === 'special_day') {
      if (!body.specialDayId) return NextResponse.json({ error: 'specialDayId zorunlu' }, { status: 400 })

      const day = FI_SPECIAL_DAYS.find(d => d.id === body.specialDayId)
      if (!day) return NextResponse.json({ error: 'Özel gün bulunamadı' }, { status: 404 })

      // Gerçek tarihi çöz
      const year = new Date().getUTCFullYear()
      const resolved = resolveSpecialDays(year).find(d => d.id === day.id)!
      dayDate = resolved.resolvedDate.toISOString().slice(0, 10)
      dayLabel = day.name_fi
      specialDayId = day.id

      generated = await generateSpecialDayContent(brandCtx, {
        date: dayDate,
        name_fi: day.name_fi,
        context_fi: day.context_fi,
        visual_hint: day.visual_hint,
      })
    }
    else if (body.category === 'weekly_routine') {
      const routineId = body.routineId ?? 'hyvaa-viikonloppua'
      const routine = FI_WEEKLY_ROUTINES.find(r => r.id === routineId)
      if (!routine) return NextResponse.json({ error: 'Rutin bulunamadı' }, { status: 404 })

      dayDate = (body.scheduledAt ?? new Date().toISOString()).slice(0, 10)
      dayLabel = routine.name_fi

      generated = await generateRoutineContent(brandCtx, {
        name_fi: routine.name_fi,
        context_fi: routine.context_fi,
        visual_hint: routine.visual_hint,
      })
    }
    else if (body.category === 'campaign') {
      if (!body.brief) return NextResponse.json({ error: 'Kampanya açıklaması zorunlu' }, { status: 400 })

      dayDate = (body.scheduledAt ?? new Date().toISOString()).slice(0, 10)
      dayLabel = 'Kampanya'

      generated = await generateCampaignContent(brandCtx, {
        brief: body.brief,
      })
    }
    else {
      return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 })
    }

    // Görseli üret (Replicate/FLUX varsa, yoksa Pollinations)
    const image = await generateImage(generated.image_prompt, { aspect })

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
        image_url:                 image.url,
        image_prompt:              generated.image_prompt,
        platforms:                 body.platforms ?? ['instagram', 'facebook'],
        campaign_brief:            body.category === 'campaign' ? body.brief : null,
        scheduled_at:              body.scheduledAt ?? null,
        status:                    'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      draft,
      imageProvider: image.provider,
    })

  } catch (err) {
    console.error('İçerik üretimi hatası:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    }, { status: 500 })
  }
}
