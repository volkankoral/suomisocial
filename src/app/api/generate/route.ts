import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateContent } from '@/lib/ai/generate-content'
import { buildImageUrl } from '@/lib/ai/generate-image'

export async function POST(req: NextRequest) {
  // Auth kontrolü (anon client)
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 })
  }
  // DB işlemleri service role ile
  const supabase = createServiceClient()

  // Body parse
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const {
    organizationId,
    specialDayDate,
    specialDayLabel,
    specialDayLabelTr,
    specialDayDescriptionTr,
    isBankHoliday,
    category,
  } = body as {
    organizationId: string
    specialDayDate: string
    specialDayLabel: string
    specialDayLabelTr: string
    specialDayDescriptionTr: string
    isBankHoliday: boolean
    category: string
  }

  // Marka ayarlarını çek
  const { data: brand, error: brandError } = await supabase
    .from('brand_settings')
    .select('business_name, description, tone, products')
    .eq('organization_id', organizationId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json(
      { error: 'Marka ayarları bulunamadı — önce marka sayfasını doldurun.' },
      { status: 404 },
    )
  }

  // Claude Haiku ile içerik üret
  let generated
  try {
    generated = await generateContent(brand, {
      date: specialDayDate,
      labelFi: specialDayLabel,
      labelTr: specialDayLabelTr,
      descriptionTr: specialDayDescriptionTr,
      isBankHoliday,
      category,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Pollinations.ai görsel URL'si (ücretsiz)
  const imageUrl = buildImageUrl(generated.image_prompt)

  // DB'ye kaydet
  const { data: draft, error: insertError } = await supabase
    .from('content_drafts')
    .insert({
      organization_id: organizationId,
      special_day_date: specialDayDate,
      special_day_label: specialDayLabel,
      special_day_label_tr: specialDayLabelTr,
      special_day_description_tr: specialDayDescriptionTr,
      caption_fi: generated.caption_fi,
      caption_tr: generated.caption_tr,
      hashtags: generated.hashtags,
      image_url: imageUrl,
      image_prompt: generated.image_prompt,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ draft }, { status: 201 })
}
