import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeLimiter } from '@/lib/rate-limit'

export const maxDuration = 30

/**
 * POST /api/onboarding/analyze
 * Body: { url: string }
 *
 * Web sitesini indirir, metni çıkarır ve AI ile marka bilgilerini doldurur.
 * Response: { business_name, description, business_type, products[], tone }
 */

function normalizeUrl(input: string): string {
  let u = input.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u
}

function extractContent(html: string): { title: string; meta: string; text: string } {
  const titleMatch  = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const descMatch   = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    title: (titleMatch?.[1] ?? '').trim(),
    meta:  (descMatch?.[1] ?? ogDescMatch?.[1] ?? '').trim(),
    text:  body.slice(0, 3500),
  }
}

interface BrandExtract {
  business_name: string
  description:   string
  business_type: string
  products:      string[]
  tone:          string
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { ok: rlOk, retryAfter } = analyzeLimiter.check(ip)
  if (!rlOk) {
    return NextResponse.json(
      { error: `Çok fazla istek. ${retryAfter} saniye bekleyin.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
    )
  }

  // Auth
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json().catch(() => ({ url: '' }))
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL gerekli' }, { status: 400 })
  }

  const target = normalizeUrl(url)

  // Siteyi indir
  let html = ''
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(target, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OccalyBot/1.0)' },
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch {
    return NextResponse.json({ error: 'site_unreachable' }, { status: 422 })
  }

  const { title, meta, text } = extractContent(html)
  if (text.length < 40) {
    return NextResponse.json({ error: 'site_unreachable' }, { status: 422 })
  }

  // AI ile marka bilgisi çıkar
  const systemPrompt = `You analyze a business website and extract structured brand info.
Respond ONLY in JSON (no markdown):
{
  "business_name": "...",
  "description": "1-2 sentence description IN THE SAME LANGUAGE as the website",
  "business_type": "e.g. restaurant, cafe, retail shop, hair salon, gym, SaaS, etc.",
  "products": ["main product/service", "..."],
  "tone": "ONE of exactly: samimi ve sıcak | profesyonel | eğlenceli ve renkli | minimalist"
}
Keep products to 3-6 items. Pick the tone that best matches the brand's style.`

  const userPrompt = `Website: ${target}
Title: ${title}
Meta description: ${meta}
Page text:
${text}`

  let extract: BrandExtract
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        max_tokens:  700,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
    })
    if (!groqRes.ok) throw new Error('groq')
    const data = await groqRes.json()
    const raw  = (data.choices?.[0]?.message?.content ?? '').trim()
    const json = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const match = json.match(/\{[\s\S]*\}/)
    extract = JSON.parse(match ? match[0] : json) as BrandExtract
  } catch {
    return NextResponse.json({ error: 'analyze_failed' }, { status: 500 })
  }

  const validTones = ['samimi ve sıcak', 'profesyonel', 'eğlenceli ve renkli', 'minimalist']

  return NextResponse.json({
    business_name: extract.business_name ?? title ?? '',
    description:   extract.description ?? meta ?? '',
    business_type: extract.business_type ?? '',
    products:      Array.isArray(extract.products) ? extract.products.slice(0, 6) : [],
    tone:          validTones.includes(extract.tone) ? extract.tone : 'samimi ve sıcak',
  })
}
