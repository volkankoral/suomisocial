import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email, password, businessName } = await req.json()

  if (!email || !password || !businessName) {
    return NextResponse.json({ error: 'Tüm alanlar zorunlu' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı' }, { status: 400 })
  }

  const supabase = await createClient()

  // Kullanıcıyı oluştur — business_name metadata'ya kaydedilir
  // Organizasyon, email onayı sonrası callback'te oluşturulur
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName },
      emailRedirectTo: `${siteUrl}/tr/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data.user) {
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirm: !data.session,
  })
}
