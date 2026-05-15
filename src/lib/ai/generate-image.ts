/**
 * Görsel üretimi — Replicate FLUX schnell (premium) + Pollinations.ai (fallback/free)
 *
 * Kullanım:
 *   await generateImage(prompt, { aspect: 'square' })  // tier'a göre otomatik seçer
 *
 * Üretici öncelik sırası:
 *   1. REPLICATE_API_TOKEN varsa → FLUX schnell (~$0.003/img, kaliteli)
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
  const provider = opts.provider ?? (process.env.REPLICATE_API_TOKEN ? 'flux' : 'pollinations')

  if (provider === 'flux') {
    try {
      const url = await generateWithFlux(prompt, aspect, opts.seed)
      return { url, provider: 'flux', prompt }
    } catch (err) {
      console.error('FLUX hatası, Pollinations\'a düşülüyor:', err)
      // Hata durumunda fallback
    }
  }

  const url = buildPollinationsUrl(prompt, aspect, opts.seed)
  return { url, provider: 'pollinations', prompt }
}

/**
 * Replicate FLUX schnell — ~$0.003/görsel, ~2 saniye
 * Synchronous mode (Prefer: wait) kullanıyoruz, polling gerekmez.
 */
async function generateWithFlux(prompt: string, aspect: ImageAspect, seed?: number): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN tanımlı değil')

  const ratio = ASPECT_DIMS[aspect].ratio

  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Prefer':        'wait',  // synchronous
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio:      ratio,
        num_outputs:       1,
        output_format:     'jpg',
        output_quality:    90,
        num_inference_steps: 4,
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
 * Pollinations.ai — ücretsiz, hemen URL döner (URL'nin kendisi görsel)
 */
function buildPollinationsUrl(prompt: string, aspect: ImageAspect, seed?: number): string {
  const { w, h } = ASPECT_DIMS[aspect]
  const params = new URLSearchParams({
    width:   String(w),
    height:  String(h),
    model:   'flux-realism',
    nologo:  'true',
    enhance: 'true',
    ...(seed !== undefined ? { seed: String(seed) } : {}),
  })
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`
}

// === Geriye dönük uyumluluk (eski kodun bozulmaması için) ===

export function buildImageUrl(prompt: string, opts: { width?: number; height?: number } = {}): string {
  const { width = 1080, height = 1080 } = opts
  const aspect: ImageAspect =
    width === height ? 'square' :
    width > height ? 'landscape' :
    height / width > 1.5 ? 'story' : 'portrait'
  return buildPollinationsUrl(prompt, aspect)
}

export function buildStoryImageUrl(prompt: string): string {
  return buildPollinationsUrl(prompt, 'story')
}
