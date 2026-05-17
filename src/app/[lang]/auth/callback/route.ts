import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase e-posta onay callback'i — /[lang]/auth/callback
 * Supabase Site URL'i dil prefixi içerdiğinde buraya gelir (örn: /tr/auth/callback)
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const lang = req.nextUrl.pathname.split('/')[1] ?? 'tr'
  const next = searchParams.get('next') ?? `/${lang}/dashboard`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/${lang}/login?error=auth_callback_failed`)
}
