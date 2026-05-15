/**
 * Groq (Llama 3.3 70B) ile sosyal medya içeriği üretimi.
 * 3 kategori destekler:
 *   - weekly_routine  → "Hyvää viikonloppua" gibi rutinler
 *   - special_day     → Finlandiya özel günleri (Vappu, Joulu vs.)
 *   - campaign        → Pizzacının kendi tanımladığı kampanya
 */

export interface BrandContext {
  business_name: string
  description: string | null
  tone: string | null
  products: unknown
  /** Genelde pizzacı için 'restaurant' / 'pizzeria' */
  business_type?: string | null
}

export interface SpecialDayContext {
  date: string
  name_fi: string
  context_fi: string
  visual_hint?: string
}

export interface RoutineContext {
  name_fi: string                 // örn. "Hyvää viikonloppua"
  context_fi: string
  visual_hint?: string
}

export interface CampaignContext {
  brief: string                   // Kullanıcı tarafından yazılan açıklama
  start_date?: string
  end_date?: string
}

export interface GeneratedContent {
  caption_fi:   string             // Fince caption (asıl içerik)
  caption_tr:   string             // Türkçe çeviri (sahip referansı)
  hashtags:     string[]
  image_prompt: string             // İngilizce — görsel üretici için
}

const COMMON_RULES = `
Respond ONLY in JSON (no other text, no markdown fences):
{
  "caption_fi":   "...",
  "caption_tr":   "...",
  "hashtags":     ["...", "..."],
  "image_prompt": "..."
}

Rules:
- caption_fi: Write in NATURAL FINNISH. 120-200 characters. Warm, local, casual tone. Use 1-3 emojis. NEVER use stiff translated phrases.
- caption_tr: Turkish translation for the business owner (so they can verify meaning).
- hashtags: 5-8 hashtags WITHOUT # symbol. Mix Finnish tags (#suomi, #helsinki, #ravintola, etc.) + business-specific tags.
- image_prompt: Detailed ENGLISH description (60-100 words). MUST start with "Professional food photography," or "Cozy restaurant photo,". NO text overlays, NO cartoons, NO illustrations. PHOTOREALISTIC ONLY. Specify lighting, composition, mood.
`

function buildBrandBlock(brand: BrandContext): string {
  const productsStr = Array.isArray(brand.products)
    ? (brand.products as string[]).join(', ')
    : typeof brand.products === 'string'
    ? brand.products
    : ''

  return `Business: ${brand.business_name}
Type: ${brand.business_type ?? 'restaurant'}
Description: ${brand.description ?? 'A local Finnish business'}
Tone: ${brand.tone ?? 'warm, friendly, local'}
Products: ${productsStr || 'general menu'}`
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<GeneratedContent> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  1024,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API hatası: ${err}`)
  }

  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content?.trim() ?? ''
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  try {
    return JSON.parse(jsonStr) as GeneratedContent
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as GeneratedContent
    throw new Error(`AI yanıtı parse edilemedi: ${raw.slice(0, 200)}`)
  }
}

/**
 * Özel gün içeriği üret (Vappu, Joulu, Itsenäisyyspäivä, vs.)
 */
export async function generateSpecialDayContent(
  brand: BrandContext,
  day: SpecialDayContext,
): Promise<GeneratedContent> {
  const systemPrompt = `You write social media posts in FINNISH for a local Finnish business.

${buildBrandBlock(brand)}

Task: Create an Instagram/Facebook post for a FINNISH SPECIAL DAY.
Connect the special day NATURALLY to the business. Don't be forced.
${COMMON_RULES}

Visual hint (use in image_prompt if relevant): ${day.visual_hint ?? '(none)'}`

  const userPrompt = `Special day: ${day.name_fi}
Date: ${day.date}
Cultural context: ${day.context_fi}

Write a warm, local Finnish post that connects ${day.name_fi} to ${brand.business_name}.`

  return callGroq(systemPrompt, userPrompt)
}

/**
 * Haftalık rutin içeriği üret (örn. "Hyvää viikonloppua")
 */
export async function generateRoutineContent(
  brand: BrandContext,
  routine: RoutineContext,
): Promise<GeneratedContent> {
  const systemPrompt = `You write social media posts in FINNISH for a local Finnish business.

${buildBrandBlock(brand)}

Task: Create a SHORT, CASUAL weekly post — a friendly greeting that fits ${routine.name_fi}.
${COMMON_RULES}

Visual hint: ${routine.visual_hint ?? '(none)'}`

  const userPrompt = `Routine: ${routine.name_fi}
Context: ${routine.context_fi}

Write a warm Finnish post wishing customers ${routine.name_fi}, gently mentioning ${brand.business_name}.`

  return callGroq(systemPrompt, userPrompt)
}

/**
 * Kampanya içeriği üret — kullanıcının açıklamasına göre
 */
export async function generateCampaignContent(
  brand: BrandContext,
  campaign: CampaignContext,
): Promise<GeneratedContent> {
  const systemPrompt = `You write social media posts in FINNISH for a local Finnish business.

${buildBrandBlock(brand)}

Task: Create a CAMPAIGN/PROMOTION post in Finnish.
Be enthusiastic but not pushy. Include a clear call-to-action.
${COMMON_RULES}`

  const dateInfo = [
    campaign.start_date ? `Starts: ${campaign.start_date}` : '',
    campaign.end_date   ? `Ends: ${campaign.end_date}`     : '',
  ].filter(Boolean).join('\n')

  const userPrompt = `Campaign description (from business owner):
"${campaign.brief}"
${dateInfo}

Write a Finnish promotional post for ${brand.business_name}.`

  return callGroq(systemPrompt, userPrompt)
}

// === Geriye dönük uyumluluk (eski generateContent) ===

export interface LegacySpecialDayContext {
  date: string
  name: string
  countryCode: string
  countryName: string
  isBankHoliday: boolean
  type: string
}

export interface LegacyGeneratedContent {
  caption_local: string
  caption_tr:    string
  hashtags:      string[]
  image_prompt:  string
}

export async function generateContent(
  brand: BrandContext,
  day: LegacySpecialDayContext,
): Promise<LegacyGeneratedContent> {
  const result = await generateSpecialDayContent(brand, {
    date: day.date,
    name_fi: day.name,
    context_fi: `${day.name} in ${day.countryName}`,
  })
  return {
    caption_local: result.caption_fi,
    caption_tr:    result.caption_tr,
    hashtags:      result.hashtags,
    image_prompt:  result.image_prompt,
  }
}
