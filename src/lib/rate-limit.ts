/**
 * Basit in-memory rate limiter
 *
 * Vercel'de her serverless instance kendi belleğini tutar — bu yaklaşım
 * distributed ortamda mükemmel değil ama Redis gerektirmeden temel
 * abuse koruması sağlar. Ciddi ölçekte Upstash Rate Limit'e geçilebilir.
 *
 * Kullanım:
 *   const rl = new RateLimiter({ windowMs: 60_000, max: 10 })
 *   const { ok, retryAfter } = rl.check(identifier)
 */

interface Entry {
  count: number
  resetAt: number
}

interface Options {
  /** Pencere süresi (ms). Default: 60_000 (1 dakika) */
  windowMs?: number
  /** Pencere başına max istek. */
  max: number
}

export class RateLimiter {
  private store = new Map<string, Entry>()
  private windowMs: number
  private max: number

  constructor(opts: Options) {
    this.windowMs = opts.windowMs ?? 60_000
    this.max = opts.max
  }

  check(key: string): { ok: boolean; retryAfter?: number; remaining: number } {
    const now = Date.now()
    let entry = this.store.get(key)

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs }
      this.store.set(key, entry)
    }

    entry.count++
    const remaining = Math.max(0, this.max - entry.count)

    if (entry.count > this.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return { ok: false, retryAfter, remaining: 0 }
    }

    return { ok: true, remaining }
  }

  /** Eski kayıtları temizle (bellek sızıntısını önle) */
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) this.store.delete(key)
    }
  }
}

// ── Önceden tanımlı limiterlar ───────────────────────────────────────────────

/** AI içerik üretimi: dakikada 5 istek / IP */
export const generateLimiter = new RateLimiter({ windowMs: 60_000, max: 5 })

/** Auth (login/register): dakikada 10 istek / IP */
export const authLimiter = new RateLimiter({ windowMs: 60_000, max: 10 })

/** Onboarding site analizi: dakikada 3 istek / IP */
export const analyzeLimiter = new RateLimiter({ windowMs: 60_000, max: 3 })

/** Genel API: dakikada 60 istek / IP */
export const apiLimiter = new RateLimiter({ windowMs: 60_000, max: 60 })

// Her 5 dakikada bir eski kayıtları temizle
setInterval(() => {
  generateLimiter.cleanup()
  authLimiter.cleanup()
  analyzeLimiter.cleanup()
  apiLimiter.cleanup()
}, 5 * 60_000)
