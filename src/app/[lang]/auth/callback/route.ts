import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Supabase e-posta onay callback'i — /[lang]/auth/callback
 * Email onaylandıktan sonra oturum açar, gerekirse org oluşturur.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const lang = req.nextUrl.pathname.split('/')[1] ?? 'tr'

  if (!code) {
    return NextResponse.redirect(`${origin}/${lang}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !sessionData.user) {
    return NextResponse.redirect(`${origin}/${lang}/login?error=auth_callback_failed`)
  }

  const user = sessionData.user
  const admin = createServiceClient()

  // Kullanıcının zaten bir org'u var mı kontrol et
  const { data: existing } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // Org yok — metadata'dan business_name al ve oluştur
    const businessName: string =
      user.user_metadata?.business_name ?? user.email?.split('@')[0] ?? 'My Business'

    const slug =
      businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) +
      '-' +
      Math.random().toString(36).slice(2, 6)

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: businessName, slug, country_code: 'FI' })
      .select()
      .single()

    if (!orgError && org) {
      await admin.from('organization_members').insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'owner',
      })
    }

    // Yeni kullanıcı → onboarding sihirbazına yönlendir
    return NextResponse.redirect(`${origin}/${lang}/onboarding`)
  }

  // Zaten org var → dashboard'a
  return NextResponse.redirect(`${origin}/${lang}/dashboard`)
}
