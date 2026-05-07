/**
 * Claude Haiku ile sosyal medya içeriği üretimi.
 * Model: claude-3-5-haiku-20241022 (~$0.001 / üretim)
 */

import Anthropic from '@anthropic-ai/sdk'

export interface BrandContext {
  business_name: string
  description: string | null
  tone: string | null
  products: unknown
}

export interface SpecialDayContext {
  date: string        // YYYY-MM-DD
  labelFi: string     // Fince ad
  labelTr: string     // Türkçe ad
  descriptionTr: string
  isBankHoliday: boolean
  category: string    // bankholiday | observed | flagday
}

export interface GeneratedContent {
  caption_fi: string    // Instagram/FB için Fince caption (150-220 karakter)
  caption_tr: string    // Sahip referansı için Türkçe
  hashtags: string[]    // 5-8 hashtag, # işaretsiz
  image_prompt: string  // FLUX/Pollinations için İngilizce görsel prompt
}

export async function generateContent(
  brand: BrandContext,
  day: SpecialDayContext,
): Promise<GeneratedContent> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const productsStr = Array.isArray(brand.products)
    ? (brand.products as string[]).join(', ')
    : typeof brand.products === 'string'
    ? brand.products
    : 'pizza, pasta'

  const system = `Olet suomalaisen ravintolan sosiaalisen median sisällöntuottaja.

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
- image_prompt: Yksityiskohtainen englanninkielinen kuvaus (50-80 sanaa), jossa näkyy ${brand.business_name} ravintolan tunnelma + erikoispäivän teema. Ei tekstiä kuvaan. Laadukas ruokakuva tai tunnelmakuva.`

  const user = `Erikoispäivä: ${day.labelTr} / ${day.labelFi}
Päivämäärä: ${day.date}
Taustatietoa: ${day.descriptionTr}
Tyyppi: ${day.isBankHoliday ? 'Resmi Tatil' : day.category === 'flagday' ? 'Bayrak Günü' : 'Tanınan Gün'}`

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  // JSON'u markdown bloğundan çıkar (varsa)
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()

  try {
    return JSON.parse(jsonStr) as GeneratedContent
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as GeneratedContent
    throw new Error(`AI yanıtı parse edilemedi: ${raw.slice(0, 200)}`)
  }
}
