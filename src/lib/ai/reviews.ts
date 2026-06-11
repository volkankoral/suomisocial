/**
 * İtibar Modülü — AI servisleri
 *
 * İki görev:
 *   1. analyzeSentiment   → yorum metnini positive/neutral/negative olarak sınıfla
 *   2. generateReplyDraft → marka tonuyla, yoruma özgü cevap taslağı üret
 *
 * Her ikisi de Groq (llama-3.3-70b) kullanır.
 * Sentiment ucuz/hızlı (az token), cevap üretimi daha detaylı.
 */

import type { BrandContext } from './generate-content'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'

// ── Groq yardımcısı ────────────────────────────────────────────────────────────

async function groq(
  system: string,
  user:   string,
  maxTokens = 512,
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       MODEL,
      max_tokens:  maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
    }),
  })

  if (!res.ok) throw new Error(`Groq hatası: ${res.status}`)
  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

// ── 1. Sentiment analizi ───────────────────────────────────────────────────────

export type Sentiment = 'positive' | 'neutral' | 'negative'

/**
 * Müşteri yorumunu analiz eder ve sentiment döner.
 * JSON: { "sentiment": "positive" | "neutral" | "negative", "reason": "..." }
 */
export async function analyzeSentiment(reviewText: string): Promise<Sentiment> {
  const system = `You are a review sentiment classifier for local businesses.
Classify the customer review as exactly one of: positive, neutral, negative.
Reply ONLY with valid JSON: {"sentiment":"positive"|"neutral"|"negative","reason":"one sentence"}`

  const raw = await groq(system, `Review: "${reviewText}"`, 120)

  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    const s = json.sentiment
    if (s === 'positive' || s === 'neutral' || s === 'negative') return s
  } catch { /* parse hatası → fallback */ }

  // Fallback: kelime bazlı basit analiz
  const lower = reviewText.toLowerCase()
  if (/terrible|awful|worst|horrible|disgusting|never again|rude|cold food|wrong order/.test(lower)) return 'negative'
  if (/great|excellent|amazing|perfect|love|best|delicious|fantastic|recommend/.test(lower)) return 'positive'
  return 'neutral'
}

// ── 2. Cevap taslağı üretimi ──────────────────────────────────────────────────

export interface ReviewReplyParams {
  brand:          BrandContext
  reviewText:     string
  sentiment:      Sentiment
  rating?:        number | null  // 1-5
  platform:       'google_business' | 'facebook' | 'instagram'
  /** Cevap dili — mevcut getContentLang() ile belirlenir */
  lang?:          string          // 'fi' | 'tr' | 'en' (default: 'en')
}

export interface ReviewReply {
  reply:  string
  draft:  true
}

const PLATFORM_LABEL: Record<string, string> = {
  google_business: 'Google',
  facebook:        'Facebook',
  instagram:       'Instagram',
}

/**
 * Müşteri yorumuna marka tonuyla, içeriğe özgü cevap taslağı üretir.
 *
 * Kural: Negatif yorumlarda bile taslak üretir ama
 * ASLA otomatik post etmez — reply_status='drafted' kalır.
 */
export async function generateReplyDraft(params: ReviewReplyParams): Promise<ReviewReply> {
  const { brand, reviewText, sentiment, rating, platform, lang = 'en' } = params

  const langMap: Record<string, string> = {
    fi: 'Finnish', tr: 'Turkish', en: 'English', sv: 'Swedish',
  }
  const langName = langMap[lang] ?? 'English'

  const ratingStr = rating != null ? `Rating: ${rating}/5 stars. ` : ''
  const platformLabel = PLATFORM_LABEL[platform] ?? 'review platform'

  const sentimentInstruction: Record<Sentiment, string> = {
    positive: 'Thank the customer warmly and specifically reference what they mentioned. Keep it genuine and personal, not generic.',
    neutral:  'Acknowledge their experience, thank them for the feedback, and invite them to return.',
    negative: 'Sincerely apologize, acknowledge the specific issue they raised, show you take it seriously, and offer to make it right (invite them to contact directly or return for a better experience). Do NOT be defensive.',
  }

  const system = `You are a reply assistant for a local business on ${platformLabel}.
Write a short, genuine, professional reply to a customer review.
Tone: ${brand.tone ?? 'warm, friendly, professional'}.
Business: ${brand.business_name} (${brand.business_category ?? 'local business'}).
Language: ${langName}.
Length: 2-4 sentences. No hashtags. No emojis unless the brand tone is very casual.
IMPORTANT: Reference the specific thing the customer mentioned — do NOT write a generic reply.
Reply ONLY with the reply text, no explanations, no quotes around it.`

  const user = `${ratingStr}Customer review: "${reviewText}"
Instruction: ${sentimentInstruction[sentiment]}`

  const reply = await groq(system, user, 300)

  return { reply, draft: true }
}
