import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateContent } from '@/lib/ai/generate-content'
import { buildImageUrl } from '@/lib/ai/generate-image'
import { getSupportedCountries } from '@/lib/calendar'

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 })
  }
  const supabase = createServiceClient()

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const {
    organizationId,
    countryCode,
    specialDayDate,
    specialDayName,
    isBankHoliday,
    type,
  } = body as {
    organizationId: string
    countryCode:    string
    specialDayDate: string
    specialDayName: string
    isBankHoliday:  boolean
    type:           string
  }

  // Marka ayarları
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

  // Ülke adını çöz (AI bağlamı için)
  const countryName = getSupportedCountries().find((c) => c.code === countryCode)?.name ?? countryCode

  // AI içerik üret
  let generated
  try {
    generated = await generateContent(brand, {
      date:          specialDayDate,
      name:          specialDayName,
      countryCode,
      countryName,
      isBankHoliday,
      type,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const imageUrl = buildImageUrl(generated.image_prompt)

  const { data: draft, error: insertError } = await supabase
    .from('content_drafts')
    .insert({
      organization_id:        organizationId,
      special_day_date:       specialDayDate,
      special_day_label:      specialDayName,
      special_day_label_tr:   specialDayName,  // local name aynı kalıyor
      special_day_description_tr: `${countryName} — ${type}`,
      caption_fi:             generated.caption_local,
      caption_tr:             generated.caption_tr,
      hashtags:               generated.hashtags,
      image_url:              imageUrl,
      image_prompt:           generated.image_prompt,
      status:                 'pending',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ draft }, { status: 201 })
}
