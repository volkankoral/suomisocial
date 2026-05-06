import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale, locales } from '@/dictionaries'

function pickLocale(request: NextRequest): string {
  const accept = request.headers.get('accept-language') ?? ''
  const preferred = accept
    .split(',')
    .map((part) => part.trim().split(';')[0].split('-')[0])
    .find((code) => (locales as readonly string[]).includes(code))
  return preferred ?? defaultLocale
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Locale routing â€” redirect if no locale prefix
  const hasLocale = (locales as readonly string[]).some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
  if (!hasLocale) {
    const locale = pickLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }

  // 2. Supabase session refresh
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const lang = pathname.split('/')[1]
  const pathWithoutLocale = pathname.slice(lang.length + 1) || '/'

  // 3. Auth protection
  if (!user && pathWithoutLocale.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = `/${lang}/login`
    return NextResponse.redirect(url)
  }

  if (user && pathWithoutLocale === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = `/${lang}/dashboard`
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
