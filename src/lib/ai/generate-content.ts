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
  /** Sektör — AI görsel stratejisini yönlendirir (restaurant, beauty, retail, fitness, services, other) */
  business_category?: string | null
}

/**
 * Sektöre göre görsel üretim stratejisi.
 * image_prompt'a hangi tür fotoğrafın üretileceğini söyler.
 * Sistem restoran için tasarlandı ama bu fonksiyon yatay açılımı sağlar.
 */
const VISUAL_STRATEGIES: Record<string, string> = {
  restaurant: `STRATEGY: make the FOOD the absolute hero. Close-up dishes with rich texture (cheese pull, rising steam, fresh ingredients artfully arranged), rustic wooden table, warm ambient lighting. If people appear, ONLY hands reaching for food or heavily blurred background silhouettes.`,

  beauty: `STRATEGY: showcase the RESULT and atmosphere — elegant salon interior, professional styling tools, beauty products beautifully arranged, macro close-ups of styled hair / manicured nails / glowing skin texture. Clean, bright, aspirational mood. Show hands at work or styled details, never identifiable faces.`,

  retail: `STRATEGY: make the PRODUCT the hero — crisp commercial product photography, attractive arrangement on a clean surface, tasteful props and lifestyle context that fits the store. Bright even lighting, shallow depth of field to isolate the product.`,

  fitness: `STRATEGY: convey ENERGY and movement — gym equipment, dynamic training atmosphere, dramatic high-contrast lighting, subtle motion blur for dynamism, sweat-and-effort textures. Show equipment, the space, or action silhouettes, never identifiable faces.`,

  services: `STRATEGY: clean, professional, conceptual imagery relevant to the service — the tools of the trade, an organized modern workspace, a polished before/after concept. Trustworthy, premium feel. Modern soft lighting.`,

  other: `STRATEGY: appealing professional photography that highlights the business's core offering — relevant objects or the space itself as the hero, attractive styling, inviting atmosphere.`,
}

function getVisualStrategy(category?: string | null): string {
  return VISUAL_STRATEGIES[category ?? 'restaurant'] ?? VISUAL_STRATEGIES.restaurant
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

/** İçerik üretim dili — bölgeye göre belirlenir */
export type ContentLang = 'fi' | 'tr' | 'en' | 'sv'

const LANG_NAME: Record<ContentLang, string> = {
  fi: 'FINNISH', tr: 'TURKISH', en: 'ENGLISH', sv: 'SWEDISH',
}

const LANG_TAGS: Record<ContentLang, string> = {
  fi: '#suomi, #helsinki', tr: '#türkiye, #istanbul', en: '#local', sv: '#sverige',
}

/** Dile göre ortak JSON kuralları */
function commonRules(lang: ContentLang, category?: string | null): string {
  const langName = LANG_NAME[lang]
  // Birincil dil Türkçe değilse referans çeviri Türkçe; Türkçeyse İngilizce
  const refLang = lang === 'tr' ? 'ENGLISH' : 'TURKISH'
  return `
Respond ONLY in JSON (no other text, no markdown fences):
{
  "caption_fi":   "...",
  "caption_tr":   "...",
  "hashtags":     ["...", "..."],
  "image_prompt": "..."
}

Rules:
- BRAND NAME: Use ONLY the exact "Business name" given in the BRAND section below. NEVER invent, translate, or substitute another brand name. Do NOT use any brand or product name that appears in these instructions/examples — those are illustrative only.
- caption_fi: Write the MAIN caption in NATURAL ${langName}. 120-200 characters. Warm, local, casual tone. Use 1-3 emojis. NEVER use stiff translated phrases.
- caption_tr: A short ${refLang} reference translation of the caption so the business owner can verify the meaning.
- hashtags: 5-8 hashtags WITHOUT # symbol. Mix local ${langName} tags (${LANG_TAGS[lang]}, etc.) + business-specific tags relevant to the actual business type. Hashtags must be real, correctly spelled ${langName} words — no typos, no garbled text.
- image_prompt: Detailed ENGLISH description (60-100 words). MUST be PHOTOREALISTIC, professional magazine quality. ${getVisualStrategy(category)} PEOPLE RULE (all categories): AVOID visible faces, children and portraits — prefer hands, objects, the space, or heavily blurred silhouettes (depth of field f/1.4 bokeh). Always specify: lighting (e.g. "dramatic side light, warm orange tones"), exact composition (e.g. "overhead flat lay", "45-degree hero shot", "macro detail"), and texture details.
${lang === 'fi' ? `
FINNISH LANGUAGE RULES (mandatory — errors will be rejected):
1. Vowel harmony (vokaalisointu): words with back vowels (a, o, u) take suffixes with a/o/u; words with front vowels (ä, ö, y) take suffixes with ä/ö/y. A loanword ending in the front vowel "y" takes front-harmony suffixes (e.g. a name ending in -y → "-llä" not "-lla").
2. Inflection (taivutus): use correct case suffixes. Illative plural of "asia" = "asioihin" (NOT "asiin"). Genitive plural of "rakas" = "rakkaiden" (NOT "rakkaitten" in modern text).
3. Company/brand names: apply Finnish vowel harmony based on the last vowel of the brand name.
4. Spell all hashtags as complete, correct Finnish words. No abbreviations, no garbled text (e.g. "#isänpäivä" NOT "#isnpiv").
5. Avoid overly formal or archaic forms. Write as a native Finnish speaker would on social media.` : ''}
`
}

function buildBrandBlock(brand: BrandContext): string {
  const productsStr = Array.isArray(brand.products)
    ? (brand.products as string[]).join(', ')
    : typeof brand.products === 'string'
    ? brand.products
    : ''

  return `Business name: ${brand.business_name}
Business category: ${brand.business_category ?? 'restaurant'}
Business type: ${brand.business_type ?? 'local Finnish business'}
Description: ${brand.description ?? 'A local Finnish business'}
Tone: ${brand.tone ?? 'warm, friendly, local'}
Products/Services: ${productsStr || 'general offerings'}`
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
  lang: ContentLang = 'fi',
): Promise<GeneratedContent> {
  const langName = LANG_NAME[lang]
  const systemPrompt = `You write social media posts in ${langName} for a local business.

${buildBrandBlock(brand)}

Task: Create an Instagram/Facebook post for a SPECIAL DAY.
Connect the special day NATURALLY to the business. Don't be forced.
${commonRules(lang, brand.business_category)}

Visual hint (use in image_prompt if relevant): ${day.visual_hint ?? '(none)'}`

  const userPrompt = `Special day: ${day.name_fi}
Date: ${day.date}
Cultural context: ${day.context_fi}

Write a warm, local ${langName} post that connects ${day.name_fi} to ${brand.business_name}.`

  return callGroq(systemPrompt, userPrompt)
}

/**
 * Haftalık rutin içeriği üret (örn. "Hyvää viikonloppua")
 */
export async function generateRoutineContent(
  brand: BrandContext,
  routine: RoutineContext,
  lang: ContentLang = 'fi',
): Promise<GeneratedContent> {
  const langName = LANG_NAME[lang]
  const systemPrompt = `You write social media posts in ${langName} for a local business.

${buildBrandBlock(brand)}

Task: Create a SHORT, CASUAL weekly post — a friendly greeting that fits ${routine.name_fi}.
${commonRules(lang, brand.business_category)}

Visual hint: ${routine.visual_hint ?? '(none)'}`

  const userPrompt = `Routine: ${routine.name_fi}
Context: ${routine.context_fi}

Write a warm ${langName} post wishing customers ${routine.name_fi}, gently mentioning ${brand.business_name}.`

  return callGroq(systemPrompt, userPrompt)
}

/**
 * Kampanya içeriği üret — kullanıcının açıklamasına göre
 */
export async function generateCampaignContent(
  brand: BrandContext,
  campaign: CampaignContext,
  lang: ContentLang = 'fi',
): Promise<GeneratedContent> {
  const langName = LANG_NAME[lang]
  const systemPrompt = `You write social media posts in ${langName} for a local business.

${buildBrandBlock(brand)}

Task: Create a CAMPAIGN/PROMOTION post in ${langName}.
Be enthusiastic but not pushy. Include a clear call-to-action.
${commonRules(lang, brand.business_category)}`

  const dateInfo = [
    campaign.start_date ? `Starts: ${campaign.start_date}` : '',
    campaign.end_date   ? `Ends: ${campaign.end_date}`     : '',
  ].filter(Boolean).join('\n')

  const userPrompt = `Campaign description (from business owner):
"${campaign.brief}"
${dateInfo}

Write a ${langName} promotional post for ${brand.business_name}.`

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
