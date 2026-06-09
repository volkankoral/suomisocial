import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId, getUserOrgCountry } from '@/lib/supabase/get-org'
import {
  generateSpecialDayContent,
  generateRoutineContent,
  generateCampaignContent,
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
import { getRegionForCountry, getContentLang, type ContentLang } from '@/lib/regions'

/**
 * POST /api/agent/run
 *
 * Tam otonom agent pipeline — 4 adım:
 *   1. Bağlam toplama (marka, takvim, geçmiş içerikler)
 *   2. Groq Llama ile haftalık strateji planı oluşturma
 *   3. Her plan kalemi için içerik + görsel üretimi (paralel)
 *   4. agent_plans + agent_plan_items tablolarına kaydetme
 *
 * Pro/Business plan veya admin gerektirir.
 */

export const maxDuration = 300

// ── Planlama LLM çağrısı ──────────────────────────────────────────────────────

interface PlanItem {
  day:            string            // ISO date
  category:       'special_day' | 'weekly_routine' | 'campaign'
  special_day_id?: string
  routine_id?:    string
  brief?:         string
  rationale:      string
  priority:       1 | 2 | 3
}

interface AgentPlan {
  strategy_summary: string
  items:            PlanItem[]
}

async function buildWeeklyPlan(params: {
  brand:          BrandContext & { business_name: string }
  upcomingDays:   { id: string; name: string; date: string; context: string }[]
  routines:       { id: string; name: string; context: string }[]
  recentTopics:   string[]
  weekStart:      string
  weekEnd:        string
  lang:           ContentLang
}): Promise<AgentPlan> {
  const { brand, upcomingDays, routines, recentTopics, weekStart, weekEnd, lang } = params

  const langName = lang === 'fi' ? 'Finnish' : lang === 'tr' ? 'Turkish' : 'English'

  const systemPrompt = `You are an expert social media strategist for local businesses.
Your job: create a strategic weekly content plan for a local business.
You reason step by step, then output a JSON plan.

Rules:
- Create 4-6 content items for the week
- Prioritize upcoming special days (priority 3) that are RELEVANT to the business
- Mix in 2-3 routine posts for variety (priority 1-2)
- Avoid repeating topics from recentTopics
- Spread posts across different days of the week
- Each rationale must be 1-2 sentences explaining WHY this content on this specific day
- Reply ONLY with valid JSON, no markdown

JSON format:
{
  "strategy_summary": "2-3 sentence overview of this week's content strategy",
  "items": [
    {
      "day": "YYYY-MM-DD",
      "category": "special_day" | "weekly_routine" | "campaign",
      "special_day_id": "...",
      "routine_id": "...",
      "brief": "...",
      "rationale": "...",
      "priority": 1 | 2 | 3
    }
  ]
}

Write strategy_summary and rationale in ${langName}.`

  const userPrompt = `Business: ${brand.business_name}
Type: ${(brand as { business_category?: string | null }).business_category ?? 'restaurant'}
Description: ${brand.description ?? 'local business'}
Tone: ${brand.tone ?? 'warm, friendly'}

Week to plan: ${weekStart} → ${weekEnd}

UPCOMING SPECIAL DAYS (next 14 days):
${upcomingDays.length ? upcomingDays.map(d => `- [${d.id}] ${d.name} (${d.date}): ${d.context}`).join('\n') : 'None in the next 14 days'}

AVAILABLE WEEKLY ROUTINES:
${routines.slice(0, 8).map(r => `- [${r.id}] ${r.name}: ${r.context}`).join('\n')}

RECENTLY PUBLISHED (avoid repeating):
${recentTopics.length ? recentTopics.map(t => `- ${t}`).join('\n') : 'No recent posts yet'}

Create the optimal content plan for this week.`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  2048,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Groq planlama hatası: ${res.status}`)
  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content ?? '{}'

  // JSON bloğunu temizle
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Agent plan JSON parse edilemedi')
  const plan: AgentPlan = JSON.parse(jsonMatch[0])

  if (!plan.items?.length) throw new Error('Agent plan boş döndü')
  return plan
}

// ── Ana handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const supabase = createServiceClient()

  // Plan veya admin kontrolü
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('is_admin')
    .eq('id', orgId)
    .single()
  const isAdmin = orgRow?.is_admin === true

  if (!isAdmin) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plans(slug)')
      .eq('organization_id', orgId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const slug = (sub as { plans?: { slug?: string } } | null)?.plans?.slug
    if (!slug || !['pro', 'business'].includes(slug)) {
      return NextResponse.json({ error: 'Pro veya Business plan gerekli', code: 'PLAN_REQUIRED' }, { status: 403 })
    }
  }

  // Marka bilgisi
  const { data: brand } = await supabase
    .from('brand_settings')
    .select('business_name, description, tone, products, overlay_text, content_language, business_category')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!brand?.business_name) {
    return NextResponse.json({ error: 'Önce marka ayarlarını tamamla (/brand)' }, { status: 400 })
  }

  // Bölge ve dil
  const countryCode = await getUserOrgCountry()
  const region      = getRegionForCountry(countryCode)
  const regionLang  = getContentLang(region)
  const brandLang   = (brand as { content_language?: string | null }).content_language
  const lang: ContentLang = (['fi', 'tr', 'en'].includes(brandLang ?? '') ? brandLang : regionLang) as ContentLang

  // Hafta aralığı (Pazartesi-Pazar)
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Paz
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const weekStart = monday.toISOString().slice(0, 10)
  const weekEnd   = sunday.toISOString().slice(0, 10)

  // force=true → planı yeniden oluştur (mevcut plan ne olursa olsun)
  let forceRecreate = false
  try {
    const body = await req.json() as { force?: boolean }
    forceRecreate = !!body.force
  } catch { /* body yok */ }

  // Mevcut plan varsa dön (idempotent) — force veya failed değilse
  const { data: existing } = await supabase
    .from('agent_plans')
    .select('id, status')
    .eq('organization_id', orgId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existing && existing.status !== 'failed' && !forceRecreate) {
    return NextResponse.json({ planId: existing.id, existing: true })
  }

  // Eski plan varsa — eski items + planı temizle (yeniden oluşturma)
  if (existing) {
    await supabase.from('agent_plan_items').delete().eq('plan_id', existing.id)
    await supabase.from('agent_plans').delete().eq('id', existing.id)
  }

  // Yeni plan kaydı oluştur
  const { data: planRow, error: planErr } = await supabase
    .from('agent_plans')
    .insert({
      organization_id: orgId,
      week_start:      weekStart,
      status:          'planning',
      error_message:   null,
    })
    .select('id')
    .single()

  if (planErr || !planRow) {
    return NextResponse.json({ error: 'Plan kaydedilemedi', detail: planErr?.message }, { status: 500 })
  }
  const planId = planRow.id

  // Yardımcı: hata durumunda planı işaretle
  async function failPlan(msg: string) {
    await supabase.from('agent_plans').update({ status: 'failed', error_message: msg }).eq('id', planId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    // ── 1. Bağlam toplama ───────────────────────────────────────────────────
    const year = now.getUTCFullYear()
    const in14days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const resolvedDays = getResolvedSpecialDays(region, year)
    const upcomingDays = resolvedDays
      .filter(d => d.resolvedDate >= now && d.resolvedDate <= in14days)
      .map(d => ({
        id:      d.id,
        name:    d.name_fi,
        date:    d.resolvedDate.toISOString().slice(0, 10),
        context: d.context_fi.slice(0, 120),
      }))

    const routines = getWeeklyRoutines(region).map(r => ({
      id:      r.id,
      name:    r.name_fi,
      context: r.context_fi.slice(0, 100),
    }))

    // Son 14 günde yayınlanan içerik başlıkları (tekrarı önlemek için)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentDrafts } = await supabase
      .from('content_drafts')
      .select('special_day_label, category, campaign_brief')
      .eq('organization_id', orgId)
      .eq('status', 'posted')
      .gte('created_at', twoWeeksAgo)
      .limit(20)

    const recentTopics = (recentDrafts ?? []).map(d =>
      d.special_day_label ?? d.campaign_brief ?? d.category
    ).filter(Boolean) as string[]

    // ── 2. LLM strateji planı ───────────────────────────────────────────────
    const agentPlan = await buildWeeklyPlan({
      brand:       brand as BrandContext & { business_name: string },
      upcomingDays,
      routines,
      recentTopics,
      weekStart,
      weekEnd,
      lang,
    })

    // Strateji özetini kaydet
    await supabase
      .from('agent_plans')
      .update({ strategy_summary: agentPlan.strategy_summary })
      .eq('id', planId)

    // ── 3. Her kalem için içerik üret (sıralı — rate limit aşımını önlemek için) ──
    const brandCtx: BrandContext = brand as BrandContext
    let successCount = 0

    for (const item of agentPlan.items.slice(0, 7)) {
      // İçerik oluşturulmadan önce row EKLEME —
      // başarısız olursa ghost 'pending' row kalmaz
      let textContent: Awaited<ReturnType<typeof generateRoutineContent>> | null = null
      let dayLabel    = 'İçerik'
      let specialDayId: string | null = null

      try {
        // ── Metin üretimi ─────────────────────────────────────────────────────
        if (item.category === 'special_day' && item.special_day_id) {
          const day = findSpecialDay(region, item.special_day_id)
          if (day) {
            const resolved = getResolvedSpecialDays(region, year).find(d => d.id === day.id)
            const dayDate  = resolved?.resolvedDate.toISOString().slice(0, 10) ?? item.day
            dayLabel       = day.name_fi
            specialDayId   = day.id
            textContent    = await generateSpecialDayContent(brandCtx,
              { date: dayDate, name_fi: day.name_fi, context_fi: day.context_fi, visual_hint: day.visual_hint },
              lang)
          }
        }

        if (!textContent && item.category === 'weekly_routine' && item.routine_id) {
          const routine = findRoutine(region, item.routine_id)
          if (routine) {
            dayLabel    = routine.name_fi
            textContent = await generateRoutineContent(brandCtx,
              { name_fi: routine.name_fi, context_fi: routine.context_fi, visual_hint: routine.visual_hint },
              lang)
          }
        }

        if (!textContent) {
          // Kampanya veya fallback
          dayLabel    = item.category === 'campaign' ? 'Kampanya' : dayLabel
          textContent = await generateCampaignContent(brandCtx,
            { brief: item.brief ?? dayLabel },
            lang)
        }
      } catch (textErr) {
        console.error('[agent/run] metin üretim hatası (atlandı):', textErr)
        continue // Metin üretimi tamamen başarısız → bu item'ı atla, gösterme
      }

      // ── Görsel üretimi (başarısız → null, item yine oluşturulur) ────────────
      let imageUrl: string | null = null
      try {
        const useFLUX = !!process.env.REPLICATE_API_TOKEN
        const image   = await generateImage(textContent.image_prompt, { aspect: 'square', provider: useFLUX ? 'flux' : 'pollinations' })
        imageUrl = image.url ?? null

        // Storage'a mirror — CDN URL'nin gerçekten hazır olduğundan emin ol
        if (imageUrl) {
          try {
            // Pollinations dinamik üretiyor, biraz bekle
            const isPollinations = imageUrl.includes('pollinations.ai')
            if (isPollinations) await new Promise(r => setTimeout(r, 3000))

            // Retry: 3 deneme, 2sn aralıkla
            let buf: ArrayBuffer | null = null
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const ctrl    = new AbortController()
                const timeout = setTimeout(() => ctrl.abort(), 20000)
                const imgRes  = await fetch(imageUrl, { signal: ctrl.signal })
                clearTimeout(timeout)
                if (imgRes.ok) {
                  const ct = imgRes.headers.get('content-type') ?? ''
                  if (ct.startsWith('image/')) {
                    buf = await imgRes.arrayBuffer()
                    break
                  }
                }
              } catch { /* deneme başarısız */ }
              if (attempt < 2) await new Promise(r => setTimeout(r, 2000))
            }

            if (buf) {
              const path = `${orgId}/agent_${Date.now()}.jpg`
              const { error: upErr } = await supabase
                .storage.from('post-media')
                .upload(path, buf, { contentType: 'image/jpeg', upsert: false })
              if (!upErr) {
                const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path)
                if (pub?.publicUrl) imageUrl = pub.publicUrl
              }
            }
          } catch { /* mirror başarısız → CDN URL */ }
        }

        // Overlay
        const overlayEnabled = (brand as { overlay_text?: boolean }).overlay_text !== false
        if (imageUrl && overlayEnabled) {
          try {
            imageUrl = await addTextOverlay({ orgId, businessName: brand.business_name, label: dayLabel, imageUrl })
          } catch { /* overlay başarısız → görseli koru */ }
        }
      } catch (imgErr) {
        console.error('[agent/run] görsel hatası (metin ile devam):', imgErr)
        // imageUrl = null olarak bırak — item yine oluşturulur
      }

      // ── Plan kalemi + Draft kaydet ─────────────────────────────────────────
      try {
        const { data: itemRow } = await supabase
          .from('agent_plan_items')
          .insert({
            plan_id:         planId,
            organization_id: orgId,
            scheduled_date:  item.day,
            rationale:       item.rationale,
            priority:        item.priority ?? 2,
            status:          'generating',
          })
          .select('id')
          .single()

        if (!itemRow) continue

        const { data: draft } = await supabase
          .from('content_drafts')
          .insert({
            organization_id:      orgId,
            category:             item.category,
            special_day_id:       specialDayId,
            special_day_date:     item.day,
            special_day_label:    dayLabel,
            special_day_label_tr: dayLabel,
            caption_fi:           textContent.caption_fi,
            caption_tr:           textContent.caption_tr,
            hashtags:             textContent.hashtags,
            image_url:            imageUrl,        // null olabilir
            image_prompt:         textContent.image_prompt,
            platforms:            ['instagram', 'facebook'],
            scheduled_at:         `${item.day}T09:00:00.000Z`,
            status:               'pending',
            is_autopilot:         true,
          })
          .select('id')
          .single()

        await supabase
          .from('agent_plan_items')
          .update({ status: 'ready', draft_id: draft?.id ?? null })
          .eq('id', itemRow.id)

        successCount++
      } catch (saveErr) {
        console.error('[agent/run] kaydetme hatası:', saveErr)
      }
    }

    if (successCount === 0) return failPlan('Hiç içerik üretilemedi')

    // ── 4. Plan tamamlandı ──────────────────────────────────────────────────
    await supabase
      .from('agent_plans')
      .update({ status: 'ready', items_total: successCount })
      .eq('id', planId)

    return NextResponse.json({ ok: true, planId, itemsGenerated: successCount })

  } catch (err) {
    console.error('[agent/run] genel hata:', err)
    return failPlan(err instanceof Error ? err.message : 'Bilinmeyen hata')
  }
}
