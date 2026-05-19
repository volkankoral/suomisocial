import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import { generateSpecialDayContent, type BrandContext } from '@/lib/ai/generate-content'
import { generateImage } from '@/lib/ai/generate-image'
import { addTextOverlay } from '@/lib/ai/add-text-overlay'
import { getUpcoming } from '@/lib/special-days'
import { getRegionForCountry, getContentLang } from '@/lib/regions'

export const maxDuration = 60

const STARTER_COUNT = 5

/**
 * POST /api/onboarding/generate-starter
 * Onboarding sonunda yaklaşan özel günler için başlangıç gönderileri üretir.
 * Kullanıcının zaten taslağı varsa tekrar üretmez.
 */
export async function POST() {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const supabase = createServiceClient()

  // Zaten taslak varsa atla (onboarding tekrarında çift üretimi önle)
  const { count: existing } = await supabase
    .from('content_drafts')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
  if ((existing ?? 0) > 0) {
    return NextResponse.json({ ok: true, count: existing, skipped: true })
  }

  // Marka bilgisi
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('business_name, description, tone, products, overlay_text')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!brand?.business_name) {
    return NextResponse.json({ error: 'Önce marka ayarlarını tamamla' }, { status: 400 })
  }

  const brandCtx: BrandContext = brand
  const overlayEnabled = (brand as { overlay_text?: boolean }).overlay_text !== false

  const countryCode = await getUserOrgCountry()
  const region      = getRegionForCountry(countryCode)
  const lang        = getContentLang(region)

  const upcoming = getUpcoming(region, 75).slice(0, STARTER_COUNT)
  if (upcoming.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  // Tüm gönderileri paralel üret
  const results = await Promise.allSettled(
    upcoming.map(async (day) => {
      const dayDate = day.resolvedDate.toISOString().slice(0, 10)

      const generated = await generateSpecialDayContent(brandCtx, {
        date:        dayDate,
        name_fi:     day.name_fi,
        context_fi:  day.context_fi,
        visual_hint: day.visual_hint,
      }, lang)

      let imageUrl: string | null = null
      try {
        const image = await generateImage(generated.image_prompt, { aspect: 'square' })
        imageUrl = image.url
        if (overlayEnabled && imageUrl) {
          imageUrl = await addTextOverlay({
            orgId,
            businessName: brand.business_name,
            label:        day.name_fi,
            imageUrl,
          })
        }
      } catch (e) {
        console.error('Starter görsel hatası:', e)
      }

      const { error } = await supabase.from('content_drafts').insert({
        organization_id:      orgId,
        category:             'special_day',
        special_day_id:       day.id,
        special_day_date:     dayDate,
        special_day_label:    day.name_fi,
        special_day_label_tr: day.name_tr,
        caption_fi:           generated.caption_fi,
        caption_tr:           generated.caption_tr,
        hashtags:             generated.hashtags,
        image_url:            imageUrl,
        image_prompt:         generated.image_prompt,
        platforms:            ['instagram', 'facebook'],
        status:               'pending',
      })
      if (error) throw new Error(error.message)
      return true
    }),
  )

  const count = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ ok: true, count })
}
