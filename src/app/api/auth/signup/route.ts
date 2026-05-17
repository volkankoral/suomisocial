import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { email, password, businessName } = await req.json()

  if (!email || !password || !businessName) {
    return NextResponse.json({ error: 'Tüm alanlar zorunlu' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Şifre en az 8 karakter olmalı' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Kullanıcıyı oluştur
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data.user) {
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }

  // 2. Organizasyon oluştur (email onayı beklenmeden)
  const admin = createServiceClient()

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

  if (orgError) {
    return NextResponse.json({ error: 'Organizasyon oluşturulamadı: ' + orgError.message }, { status: 500 })
  }

  // 3. Kullanıcıyı owner olarak ekle
  const { error: memberError } = await admin.from('organization_members').insert({
    user_id: data.user.id,
    organization_id: org.id,
    role: 'owner',
  })

  if (memberError) {
    return NextResponse.json({ error: 'Üyelik oluşturulamadı: ' + memberError.message }, { status: 500 })
  }

  // email_confirmed_at yoksa email onayı bekleniyor demektir
  const needsEmailConfirm = !data.session

  return NextResponse.json({
    ok: true,
    needsEmailConfirm,
  })
}
