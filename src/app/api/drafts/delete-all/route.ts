import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSSRClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * POST /api/drafts/delete-all
 * Body: { password: string }
 *
 * Kullanıcının şifresini doğrular, ardından organizasyona ait
 * ARŞİVLENMEMİŞ tüm taslakları kalıcı siler. Arşivdekiler korunur.
 */
export async function POST(req: NextRequest) {
  // 1. Oturum doğrula
  const authClient = await createSSRClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = await getUserOrgId()
  if (!orgId) {
    return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })
  }

  // 2. Şifreyi al
  const { password } = await req.json().catch(() => ({ password: '' }))
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Şifre gerekli' }, { status: 400 })
  }

  // 3. Şifreyi doğrula — oturumu etkilemeyen ayrı client ile
  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (signInError) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 403 })
  }

  // 4. Arşivlenmemiş taslakları sil
  const supabase = createServiceClient()
  const { data: deleted, error } = await supabase
    .from('content_drafts')
    .delete()
    .eq('organization_id', orgId)
    .or('archived.is.null,archived.eq.false')
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: deleted?.length ?? 0 })
}
