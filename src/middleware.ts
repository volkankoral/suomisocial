import { NextRequest, NextResponse } from 'next/server'

// Scraper/abuse bot patterns — SEO bots (Googlebot, Bingbot) intentionally excluded
const BAD_BOT_PATTERNS = [
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /scrapy/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /ccbot/i,
  /dataforseo/i,
  /magpie-crawler/i,
  /masscan/i,
  /nikto/i,
  /sqlmap/i,
  /zgrab/i,
  /nuclei/i,
]

// Attack probe patterns — PHP/WordPress/config file probes
const ATTACK_PATH_PATTERNS = [
  /\.php(\?|$)/i,
  /\.asp(x)?(\?|$)/i,
  /wp-(admin|login|includes)/i,
  /phpMyAdmin/i,
  /\/\.env(\.|$)/i,
  /\/\.git\//i,
  /xmlrpc\.php/i,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
  /union.*select/i,
  /<script/i,
]

// Routes that must accept programmatic requests (webhooks, OAuth callbacks)
const BYPASS_PREFIXES = [
  '/api/webhooks/',
  '/api/oauth/',
  '/api/stripe/',
  '/auth/callback',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow bypass routes
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Block attack path probes
  if (ATTACK_PATH_PATTERNS.some(p => p.test(pathname))) {
    return new NextResponse(null, { status: 404 })
  }

  const ua = req.headers.get('user-agent') ?? ''

  // Block requests with no UA on API routes (legitimate browsers always send UA)
  if (!ua && pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 403 })
  }

  // Block known bad bots
  if (BAD_BOT_PATTERNS.some(p => p.test(ua))) {
    return new NextResponse(null, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
}
