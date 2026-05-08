/**
 * Görsel üretimi — Pollinations.ai (ücretsiz, API key gerektirmez)
 * URL'nin kendisi görsel kaynağı, ayrıca API çağrısı yapılmıyor.
 * İleride Replicate FLUX schnell (~$0.003/görsel) ile kolayca değiştirilebilir.
 */

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt'

export interface ImageOptions {
  width?: number   // default: 1080
  height?: number  // default: 1080
  model?: 'flux' | 'flux-realism' | 'turbo'
  seed?: number
}

/**
 * Verilen prompt için Pollinations.ai görsel URL'si üretir.
 * URL doğrudan <img src> olarak kullanılabilir.
 */
export function buildImageUrl(prompt: string, opts: ImageOptions = {}): string {
  const {
    width = 1080,
    height = 1080,
    model = 'flux-realism',
  } = opts

  const encoded = encodeURIComponent(prompt)
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: 'true',
    enhance: 'true',
  })

  return `${POLLINATIONS_BASE}/${encoded}?${params.toString()}`
}

/**
 * Stories / Reels için 9:16 format
 */
export function buildStoryImageUrl(prompt: string): string {
  return buildImageUrl(prompt, { width: 1080, height: 1920 })
}
