/**
 * Görsel üretimi — Replicate FLUX 1.1 Pro Ultra (premium) + Pollinations.ai (fallback/free)
 *
 * Kullanım:
 *   await generateImage(prompt, { aspect: 'square' })  // tier'a göre otomatik seçer
 *
 * Üretici öncelik sırası:
 *   1. REPLICATE_API_TOKEN varsa → FLUX 1.1 Pro Ultra (~$0.06/img, en yüksek kalite)
 *   2. Yoksa → Pollinations.ai (ücretsiz, daha düşük kalite)
 */

export type ImageAspect = 'square' | 'portrait' | 'landscape' | 'story'

export interface ImageOptions {
  aspect?: ImageAspect
  /** Üretici override — varsayılan: REPLICATE_API_TOKEN varsa 'flux', yoksa 'pollinations' */
  provider?: 'flux' | 'pollinations'
  seed?: number
}

export interface GeneratedImage {
  url: string
  provider: 'flux' | 'pollinations'
  prompt: string
}

const ASPECT_DIMS: Record<ImageAspect, { w: number; h: number; ratio: string }> = {
  square:    { w: 1080, h: 1080, ratio: '1:1'  },
  portrait:  { w: 1080, h: 1350, ratio: '4:5'  },
  landscape: { w: 1200, h: 628,  ratio: '16:9' },
  story:     { w: 1080, h: 1920, ratio: '9:16' },
}

/**
 * Ana giriş noktası. Mevcut env'e göre en iyi üreticiyi seçer.
 */
export async function generateImage(prompt: string, opts: ImageOptions = {}): Promise<GeneratedImage> {
  const aspect = opts.aspect ?? 'square'
  const provider = opts.provider ?? (process.env.REPLICATE_API_TOKEN ? 'flux' : 'loremflickr')

  if (provider === 'flux') {
    try {
      const url = await generateWithFlux(prompt, aspect, opts.seed)
      return { url, provider: 'flux', prompt }
    } catch (err) {
      console.error('FLUX hatası, loremflickr\'a düşülüyor:', err)
      // Hata durumunda fallback
    }
  }

  const url = buildLoremFlickrUrl(prompt, aspect, opts.seed)
  return { url, provider: 'pollinations', prompt }
}

/**
 * Bilinen AI görsel defoları — FLUX negative prompt olarak kullanılır.
 * Yüz bozukluğu, fazla parmak, anormal anatomi, düşük kalite.
 */
const FLUX_NEGATIVE_PROMPT = [
  // Yüz & insan anatomisi — kesinlikle yok
  'face', 'faces', 'portrait', 'person looking at camera',
  'child', 'children', 'kid', 'baby', 'toddler',
  'distorted face', 'deformed face', 'disfigured face', 'asymmetric face',
  'crossed eyes', 'extra eyes', 'bad teeth', 'ugly teeth', 'open mouth',
  'extra fingers', 'missing fingers', 'fused fingers', 'mutated hands',
  'poorly drawn hands', 'extra limbs', 'missing limbs', 'bad anatomy',
  'malformed', 'mutation', 'deformed',
  // Görsel kalite
  'low quality', 'low resolution', 'pixelated', 'grainy', 'noisy',
  'overexposed', 'underexposed', 'bad lighting', 'washed out',
  // Stil
  'cartoon', 'anime', 'illustration', 'drawing', 'painting', 'sketch',
  'CGI', '3D render', 'plastic', 'video game', 'unrealistic',
  // Gereksiz elementler
  'text', 'watermark', 'logo', 'signature', 'overlay', 'frame', 'border',
  // Yemek spesifik
  'unappetizing food', 'rotten food', 'burnt food', 'raw dough', 'fake food',
].join(', ')

/**
 * Replicate FLUX 1.1 Pro Ultra — ~$0.06/görsel, en yüksek kalite
 * Ultra, negative_prompt desteklemiyor; bunun yerine raw=false ile prompt enhancement açık.
 * Synchronous mode (Prefer: wait) kullanıyoruz, polling gerekmez.
 */
async function generateWithFlux(prompt: string, aspect: ImageAspect, seed?: number): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN tanımlı değil')

  const ratio = ASPECT_DIMS[aspect].ratio

  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'wait',  // synchronous
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio:     ratio,
        output_format:    'jpg',
        output_quality:   95,
        safety_tolerance: 2,
        raw:              false,  // false = prompt enhancement açık (daha iyi sonuç)
        ...(seed !== undefined ? { seed } : {}),
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Replicate API hatası ${res.status}: ${txt}`)
  }

  const data = await res.json()

  // Eğer hâlâ processing'de ise (Prefer: wait timeout), polling'e geç
  if (data.status === 'starting' || data.status === 'processing') {
    return await pollReplicate(data.id, token)
  }

  if (data.status === 'failed') {
    throw new Error(`FLUX üretimi başarısız: ${data.error}`)
  }

  const output = Array.isArray(data.output) ? data.output[0] : data.output
  if (!output) throw new Error('FLUX boş çıktı döndü')
  return output as string
}

async function pollReplicate(predictionId: string, token: string): Promise<string> {
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000))
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output[0] : data.output
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`FLUX işi başarısız: ${data.error ?? data.status}`)
    }
  }
  throw new Error('FLUX zaman aşımı (30sn)')
}

/**
 * LoremFlickr — ücretsiz stok fotoğraf servisi, keyword'e göre gerçek fotoğraflar döner.
 * Her çağrıda farklı görsel gelebilir; agent/run'da Storage'a mirror edilir.
 */
function buildLoremFlickrUrl(prompt: string, aspect: ImageAspect, seed?: number): string {
  const { w, h } = ASPECT_DIMS[aspect]

  // Prompt'tan yiyecek/restoran anahtar kelimelerini çıkar
  const lower = prompt.toLowerCase()
  const foodTerms = ['pizza', 'pasta', 'burger', 'sushi', 'salad', 'soup', 'dessert', 'cake',
    'coffee', 'drink', 'cocktail', 'steak', 'seafood', 'sandwich', 'bakery', 'bread',
    'restaurant', 'cafe', 'food', 'meal', 'dinner', 'lunch', 'breakfast']
  const found = foodTerms.filter(t => lower.includes(t))
  const tags  = found.length > 0 ? found.slice(0, 3).join(',') : 'food,restaurant'

  // lock=seed ile aynı keyword'de tutarlı fotoğraf seç
  const lockParam = seed !== undefined ? `?lock=${seed}` : `?lock=${Math.floor(Math.random() * 9999)}`
  return `https://loremflickr.com/${w}/${h}/${tags}${lockParam}`
}

// === Geriye dönük uyumluluk (eski kodun bozulmaması için) ===

export function buildImageUrl(prompt: string, opts: { width?: number; height?: number } = {}): string {
  const { width = 1080, height = 1080 } = opts
  const aspect: ImageAspect =
    width === height ? 'square' :
    width > height ? 'landscape' :
    height / width > 1.5 ? 'story' : 'portrait'
  return buildLoremFlickrUrl(prompt, aspect)
}

export function buildStoryImageUrl(prompt: string): string {
  return buildLoremFlickrUrl(prompt, 'story')
}
