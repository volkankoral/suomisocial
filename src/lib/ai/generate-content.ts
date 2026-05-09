/**
 * Groq (Llama 3.3 70B) ile çok ülkeli sosyal medya içeriği üretimi.
 */

export interface BrandContext {
  business_name: string
  description: string | null
  tone: string | null
  products: unknown
}

export interface SpecialDayContext {
  date: string
  name: string                // Local name (örn. "Vappu", "Christmas Day")
  countryCode: string         // ISO 2 letter
  countryName: string         // Full name (örn. "Finland", "Türkiye")
  isBankHoliday: boolean
  type: string
}

export interface GeneratedContent {
  caption_local: string       // Yerel dilde caption
  caption_tr:    string       // Türkçe çeviri (sahip referansı için)
  hashtags:      string[]
  image_prompt:  string
}

// Ülke kodu → ana dil eşlemesi (BCP-47 / ISO 639-1)
const COUNTRY_LANGUAGES: Record<string, { lang: string; langName: string }> = {
  FI: { lang: 'fi',    langName: 'Finnish (Suomi)' },
  SE: { lang: 'sv',    langName: 'Swedish (Svenska)' },
  NO: { lang: 'no',    langName: 'Norwegian (Norsk)' },
  DK: { lang: 'da',    langName: 'Danish (Dansk)' },
  DE: { lang: 'de',    langName: 'German (Deutsch)' },
  AT: { lang: 'de',    langName: 'German (Deutsch)' },
  CH: { lang: 'de',    langName: 'German (Deutsch)' },
  FR: { lang: 'fr',    langName: 'French (Français)' },
  IT: { lang: 'it',    langName: 'Italian (Italiano)' },
  ES: { lang: 'es',    langName: 'Spanish (Español)' },
  PT: { lang: 'pt',    langName: 'Portuguese (Português)' },
  NL: { lang: 'nl',    langName: 'Dutch (Nederlands)' },
  PL: { lang: 'pl',    langName: 'Polish (Polski)' },
  GR: { lang: 'el',    langName: 'Greek (Ελληνικά)' },
  TR: { lang: 'tr',    langName: 'Turkish (Türkçe)' },
  RU: { lang: 'ru',    langName: 'Russian (Русский)' },
  US: { lang: 'en',    langName: 'English (US)' },
  GB: { lang: 'en',    langName: 'English (UK)' },
  AU: { lang: 'en',    langName: 'English (AU)' },
  CA: { lang: 'en',    langName: 'English (CA)' },
  JP: { lang: 'ja',    langName: 'Japanese (日本語)' },
  CN: { lang: 'zh',    langName: 'Chinese (中文)' },
  KR: { lang: 'ko',    langName: 'Korean (한국어)' },
  AE: { lang: 'ar',    langName: 'Arabic (العربية)' },
  SA: { lang: 'ar',    langName: 'Arabic (العربية)' },
  BR: { lang: 'pt-BR', langName: 'Portuguese (Brazil)' },
  MX: { lang: 'es',    langName: 'Spanish (Mexico)' },
  IN: { lang: 'en',    langName: 'English (India)' },
}

function getLanguage(countryCode: string): { lang: string; langName: string } {
  return COUNTRY_LANGUAGES[countryCode.toUpperCase()] ?? { lang: 'en', langName: 'English' }
}

export async function generateContent(
  brand: BrandContext,
  day: SpecialDayContext,
): Promise<GeneratedContent> {
  const productsStr = Array.isArray(brand.products)
    ? (brand.products as string[]).join(', ')
    : typeof brand.products === 'string'
    ? brand.products
    : ''

  const { langName } = getLanguage(day.countryCode)

  const systemPrompt = `You are a social media content creator for a local business in ${day.countryName}.

Business: ${brand.business_name}
Description: ${brand.description ?? 'A local business'}
Tone: ${brand.tone ?? 'warm, friendly, local'}
Products / services: ${productsStr || 'general products'}

Task: Create an Instagram/Facebook post for a special day in ${day.countryName}.

Respond ONLY in JSON, no other text:
{
  "caption_local": "...",
  "caption_tr": "...",
  "hashtags": ["...", "..."],
  "image_prompt": "..."
}

Rules:
- caption_local: Write in ${langName}, 150-220 characters, emojis OK, culturally appropriate for ${day.countryName}, naturally connect the special day to the business
- caption_tr: Turkish translation (for the business owner's reference)
- hashtags: 5-8 hashtags WITHOUT the # symbol, mix local-language tags + business-related tags
- image_prompt: Detailed English description (50-80 words). MUST start with "Professional food photography," or "Cozy restaurant interior photo," or similar realistic-photography phrase. NO text in image, NO cartoons, NO illustrations. Realistic photographic style only.`

  const userPrompt = `Special day: ${day.name}
Country: ${day.countryName} (${day.countryCode})
Date: ${day.date}
Type: ${day.isBankHoliday ? 'Public holiday (businesses closed)' : day.type}

Generate a culturally appropriate post that connects this day to ${brand.business_name}.`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.7,
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
