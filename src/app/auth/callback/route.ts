import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase e-posta onay callback'i.
 * Kullanıcı onay e-postasındaki bağlantıya tıkladığında buraya gelir.
 * Oturum açılır ve dashboard'a yönlendirilir.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/tr/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Hata durumunda login'e yönlendir
  return NextResponse.redirect(`${origin}/tr/login?error=auth_callback_failed`)
}
