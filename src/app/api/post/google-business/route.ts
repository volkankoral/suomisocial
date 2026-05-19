import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { getValidGoogleToken, GBP_V4_API } from '@/lib/google-business'

// Onaylı bir taslağı Google Business Profile'a "Local Post" olarak yayınlar
export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await req.json()
  if (!draftId) return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 })

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  // Taslağı çek
  const { data: draft, error: draftErr } = await supabase
    .from('content_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('organization_id', orgId)
    .single()

  if (draftErr || !draft) return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 })
  if (draft.status !== 'approved') {
    return NextResponse.json({ error: 'Sadece onaylı taslaklar paylaşılabilir' }, { status: 400 })
  }

  // Bağlı Google Business hesabı (ilk lokasyon)
  const { data: gbAccount } = await supabase
    .from('social_accounts')
    .select('id, platform_account_id, access_token_vault_id, refresh_token_vault_id, access_token, token_expires_at, metadata')
    .eq('organization_id', orgId)
    .eq('platform', 'google_business')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!gbAccount) {
    return NextResponse.json({ error: 'Bağlı Google Business hesabı bulunamadı' }, { status: 404 })
  }

  // Geçerli token (gerekirse yenilenir)
  const token = await getValidGoogleToken(gbAccount)
  if (!token) return NextResponse.json({ error: 'Google Business token okunamadı' }, { status: 500 })

  const accountId  = (gbAccount.metadata as { account_id?: string })?.account_id
  const locationId = gbAccount.platform_account_id
  if (!accountId) {
    return NextResponse.json({ error: 'Hesap kimliği eksik — Google Business hesabını yeniden bağla' }, { status: 400 })
  }

  // Local Post içeriği — summary max 1500 karakter
  const summary = [
    draft.caption_fi,
    draft.hashtags?.length ? draft.hashtags.map((h: string) => `#${h}`).join(' ') : '',
  ].filter(Boolean).join('\n\n').slice(0, 1500)

  const postBody: Record<string, unknown> = {
    languageCode: 'fi',
    summary,
    topicType:    'STANDARD',
  }
  if (draft.image_url) {
    postBody.media = [{ mediaFormat: 'PHOTO', sourceUrl: draft.image_url }]
  }

  const gbRes = await fetch(
    `${GBP_V4_API}/accounts/${accountId}/locations/${locationId}/localPosts`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(postBody),
    },
  )
  const gbData = await gbRes.json()

  if (!gbRes.ok || gbData.error) {
    const msg = gbData.error?.message ?? 'Google Business API hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const gbPostId = gbData.name ?? null

  // Taslağı 'posted' yap
  await supabase
    .from('content_drafts')
    .update({ status: 'posted', platforms: ['google_business'] })
    .eq('id', draftId)

  // posts tablosuna kayıt
  await supabase.from('posts').upsert(
    {
      organization_id:   orgId,
      draft_id:          draftId,
      social_account_id: gbAccount.id ?? null,
      platform:          'google_business',
      platform_post_id:  gbPostId,
      caption:           summary,
      hashtags:          draft.hashtags ?? [],
      image_url:         draft.image_url ?? null,
      status:            'posted',
      posted_at:         new Date().toISOString(),
    },
    { onConflict: 'platform_post_id' },
  )

  return NextResponse.json({ ok: true, gbPostId })
}
