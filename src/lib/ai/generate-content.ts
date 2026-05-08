/**
 * Groq (Llama 3) ile sosyal medya içeriği üretimi.
 * Model: llama-3.3-70b-versatile (ücretsiz tier)
 */

export interface BrandContext {
  business_name: string
  description: string | null
  tone: string | null
  products: unknown
}

export interface SpecialDayContext {
  date: string
  labelFi: string
  labelTr: string
  descriptionTr: string
  isBankHoliday: boolean
  category: string
}

export interface GeneratedContent {
  caption_fi: string
  caption_tr: string
  hashtags: string[]
  image_prompt: string
}

export async function generateContent(
  brand: BrandContext,
  day: SpecialDayContext,
): Promise<GeneratedContent> {
  const productsStr = Array.isArray(brand.products)
    ? (brand.products as string[]).join(', ')
    : typeof brand.products === 'string'
    ? brand.products
    : 'pizza, pasta'

  const systemPrompt = `Olet suomalaisen ravintolan sosiaalisen median sisällöntuottaja.

Ravintola: ${brand.business_name}
Kuvaus: ${brand.description ?? 'Pizzeria Finlandiyassa'}
Tyyli: ${brand.tone ?? 'lämmin, ystävällinen, paikallinen'}
Tuotteet: ${productsStr}

Tehtävä: Tuota Instagram/Facebook -julkaisu erikoispäivästä.

Vastaa AINOASTAAN JSON-muodossa, ei muuta tekstiä:
{
  "caption_fi": "...",
  "caption_tr": "...",
  "hashtags": ["...", "..."],
  "image_prompt": "..."
}

Ohjeet:
- caption_fi: Fince, 150-220 merkki, emoji sopii, ravintolaan liittyvä viesti
- caption_tr: Türkçe çeviri (sahip için referans)
- hashtags: 5-8 kpl, ilman #-merkkiä, suomenkieliset + ravintola-aiheiset
- image_prompt: Yksityiskohtainen englanninkielinen kuvaus (50-80 sanaa). Ei tekstiä kuvaan.`

  const userPrompt = `Erikoispäivä: ${day.labelTr} / ${day.labelFi}
Päivämäärä: ${day.date}
Taustatietoa: ${day.descriptionTr}
Tyyppi: ${day.isBankHoliday ? 'Resmi Tatil' : day.category === 'flagday' ? 'Bayrak Günü' : 'Tanınan Gün'}`

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
