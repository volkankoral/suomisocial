import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  generateSpecialDayContent,
  generateRoutineContent,
  type BrandContext,
} from '@/lib/ai/generate-content'
import { generateImage } from '@/lib/ai/generate-image'
import { addTextOverlay } from '@/lib/ai/add-text-overlay'
import {
  findSpecialDay,
  findRoutine,
  getResolvedSpecialDays,
  getWeeklyRoutines,
} from '@/lib/special-days'
import { getRegionForCountry, getContentLang, type ContentLang, type Region } from '@/lib/regions'
import { sendAutopilotReadyEmail } from '@/lib/email'

/**
 * GET /api/autopilot/run
 *
 * Vercel Cron tarafından her gün 07:00 UTC'de çağrılır.
 * CRON_SECRET ile korunur — vercel.json'daki schedule'a göre Authorization header içerir.
 *
 * Akış:
 *   1. Bugünün gününe (UTC day_of_week) sahip, autopilot enabled org'ları bul
 *   2. Sadece Pro/Business aboneliği olanları filtrele
 *   3. Her org için drafts_per_run adet taslak üret (özel gün öncelikli, sonra rutin)
 *   4. content_drafts'a is_autopilot=true, status='pending' olarak kaydet
 *   5. Email bildirimi gönder (RESEND_API_KEY varsa)
 */

export const maxDuration = 300 // 5 dakika (Vercel Pro)

// ── İçerik seçici ────────────────────────────────────────────────────────────
interface ContentPick {
  category: 'special_day' | 'weekly_routine'
  specialDayId?: string
  routineId?: string
}

function pickContent(region: Region, count: number): ContentPick[] {
  const now  = new Date()
  const year = now.getUTCFullYear()

  // Önümüzdeki 7 gün içindeki özel günleri bul
  const in7days  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const resolved = getResolvedSpecialDays(region, year)
  const upcoming = resolved.filter(
    d => d.resolvedDate >= now && d.resolvedDate <= in7days
  )

  const picks: ContentPick[] = []

  // Önce özel günler (max 2)
  for (const day of upcoming.slice(0, Math.min(2, count))) {
    picks.push({ category: 'special_day', specialDayId: day.id })
  }

  // Geri kalanı rutin ile doldur
  const routines = [...getWeeklyRoutines(region)].sort(() => Math.random() - 0.5)
  let ri = 0
  while (picks.length < count && ri < routines.length) {
    picks.push({ category: 'weekly_routine', routineId: routines[ri].id })
    ri++
  }

  return picks
}

// ── Org bilgisi ───────────────────────────────────────────────────────────────
async function getOrgInfo(supabaseAdmin: ReturnType<typeof createServiceClient>, orgId: string) {
  const { data: member } = await supabaseAdmin
    .from('organization_members')
    .select('user_id, organizations(name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!member?.user_id) return null

  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(member.user_id)
  return {
    email:        user?.email ?? null,
    businessName: (member.organizations as { name?: string } | null)?.name ?? 'İşletmeniz',
  }
}

// ── Ana handler ───────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Auth — Vercel Cron otomatik Authorization header ekler
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createServiceClient()
  const now           = new Date()
  const dayOfWeek     = now.getUTCDay() // 0=Paz, 1=Pzt, ..., 6=Cmt

  // Bugün için schedule'lı ve enabled org'ları getir
  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from('autopilot_settings')
    .select('organization_id, drafts_per_run')
    .eq('enabled', true)
    .eq('day_of_week', dayOfWeek)

  if (settingsErr) {
    console.error('[autopilot/run] settings fetch error:', settingsErr)
    return NextResponse.json({ error: settingsErr.message }, { status: 500 })
  }

  if (!settings?.length) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Bugün için planlanmış org yok' })
  }

  const results: Array<{ orgId: string; generated: number; error?: string }> = []

  for (const setting of settings) {
    const { organization_id: orgId, drafts_per_run } = setting as {
      organization_id: string
      drafts_per_run: number
    }

    try {
      // Abonelik kontrolü — sadece Pro/Business
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id, plans(slug)')
        .eq('organization_id', orgId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const planSlug = (sub as { plans?: { slug?: string } } | null)?.plans?.slug
      if (!planSlug || !['pro', 'business'].includes(planSlug)) {
        results.push({ orgId, generated: 0, error: 'Plan autopilot desteklemiyor (Pro/Business gerekli)' })
        continue
      }

      // Marka ayarları
      const { data: brand } = await supabaseAdmin
        .from('brand_settings')
        .select('business_name, description, tone, products, overlay_text, content_language, business_category')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (!brand?.business_name) {
        results.push({ orgId, generated: 0, error: 'Marka ayarları eksik' })
        continue
      }

      // Ülke & dil
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('country_code')
        .eq('id', orgId)
        .single()

      const countryCode   = (org as { country_code?: string } | null)?.country_code ?? 'FI'
      const region        = getRegionForCountry(countryCode)
      const regionDefault = getContentLang(region)
      const brandLang     = (brand as { content_language?: string | null }).content_language
      const lang: ContentLang = (['fi', 'tr', 'en'].includes(brandLang ?? '') ? brandLang : regionDefault) as ContentLang

      const brandCtx: BrandContext = brand as BrandContext

      // İçerik seç
      const picks = pickContent(region, drafts_per_run ?? 4)
      let generated = 0

      for (const pick of picks) {
        try {
          let textContent: Awaited<ReturnType<typeof generateRoutineContent>>
          let dayDate: string
          let dayLabel: string
          let specialDayId: string | null = null

          if (pick.category === 'special_day') {
            const day = findSpecialDay(region, pick.specialDayId!)
            if (!day) continue

            const resolved = getResolvedSpecialDays(region, now.getUTCFullYear())
              .find(d => d.id === day.id)
            if (!resolved) continue

            dayDate      = resolved.resolvedDate.toISOString().slice(0, 10)
            dayLabel     = day.name_fi
            specialDayId = day.id
            textContent  = await generateSpecialDayContent(
              brandCtx,
              { date: dayDate, name_fi: day.name_fi, context_fi: day.context_fi, visual_hint: day.visual_hint },
              lang
            )
          } else {
            const routine = findRoutine(region, pick.routineId!)
            if (!routine) continue

            dayDate     = now.toISOString().slice(0, 10)
            dayLabel    = routine.name_fi
            textContent = await generateRoutineContent(
              brandCtx,
              { name_fi: routine.name_fi, context_fi: routine.context_fi, visual_hint: routine.visual_hint },
              lang
            )
          }

          // Görsel — autopilot için her zaman Pollinations (ücretsiz, hızlı)
          let imageUrl: string | null = null
          try {
            const image = await generateImage(textContent.image_prompt, { aspect: 'square', provider: 'pollinations' })
            imageUrl    = image.url

            // Overlay
            const overlayEnabled = (brand as { overlay_text?: boolean }).overlay_text !== false
            if (imageUrl && overlayEnabled) {
              imageUrl = await addTextOverlay({ orgId, businessName: brand.business_name, label: dayLabel, imageUrl })
            }
          } catch (imgErr) {
            console.error('[autopilot] görsel üretim hatası (devam):', imgErr)
          }

          // Draft kaydet
          const { error: insertErr } = await supabaseAdmin.from('content_drafts').insert({
            organization_id:   orgId,
            category:          pick.category,
            special_day_id:    specialDayId,
            special_day_date:  dayDate,
            special_day_label: dayLabel,
            special_day_label_tr: dayLabel,
            caption_fi:        textContent.caption_fi,
            caption_tr:        textContent.caption_tr,
            hashtags:          textContent.hashtags,
            image_url:         imageUrl,
            image_prompt:      textContent.image_prompt,
            platforms:         ['instagram', 'facebook'],
            status:            'pending',
            is_autopilot:      true,
          })

          if (insertErr) {
            console.error('[autopilot] draft insert hatası:', insertErr)
          } else {
            generated++
          }
        } catch (pickErr) {
          console.error('[autopilot] pick generation hatası:', pickErr)
        }
      }

      // last_run_at güncelle
      await supabaseAdmin
        .from('autopilot_settings')
        .update({ last_run_at: now.toISOString() })
        .eq('organization_id', orgId)

      // E-posta bildirimi (fire-and-forget)
      if (generated > 0) {
        getOrgInfo(supabaseAdmin, orgId).then(info => {
          if (info?.email) {
            sendAutopilotReadyEmail({
              to:           info.email,
              businessName: info.businessName,
              draftCount:   generated,
              lang,
            }).catch(() => {})
          }
        }).catch(() => {})
      }

      results.push({ orgId, generated })

    } catch (orgErr) {
      console.error('[autopilot] org işleme hatası:', orgErr)
      results.push({ orgId, generated: 0, error: orgErr instanceof Error ? orgErr.message : 'Bilinmeyen hata' })
    }
  }

  const totalGenerated = results.reduce((s, r) => s + r.generated, 0)
  console.log(`[autopilot/run] ${results.length} org işlendi, ${totalGenerated} taslak üretildi`)

  return NextResponse.json({
    ok:        true,
    processed: results.length,
    generated: totalGenerated,
    results,
  })
}
