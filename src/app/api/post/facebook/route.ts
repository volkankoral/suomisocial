import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { getSocialToken } from '@/lib/vault'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function POST(req: NextRequest) {
  // Auth
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await req.json()
  if (!draftId) return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 })

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  // Draft'ı çek
  const { data: draft, error: draftErr } = await supabase
    .from('content_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('organization_id', orgId)
    .single()

  if (draftErr || !draft) return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 })
  if (draft.status !== 'approved') return NextResponse.json({ error: 'Sadece onaylı taslaklar paylaşılabilir' }, { status: 400 })

  // Facebook hesabını çek
  const { data: fbAccount } = await supabase
    .from('social_accounts')
    .select('platform_account_id, access_token_vault_id, access_token')
    .eq('organization_id', orgId)
    .eq('platform', 'facebook')
    .eq('is_active', true)
    .single()

  if (!fbAccount) return NextResponse.json({ error: 'Bağlı Facebook hesabı bulunamadı' }, { status: 404 })

  // Token'ı vault'tan oku
  const pageToken = await getSocialToken(fbAccount)
  if (!pageToken) return NextResponse.json({ error: 'Facebook token okunamadı' }, { status: 500 })

  const pageId  = fbAccount.platform_account_id
  const caption = [
    draft.caption_fi,
    draft.hashtags?.length ? draft.hashtags.map((h: string) => `#${h}`).join(' ') : '',
  ].filter(Boolean).join('\n\n')

  let fbResponse: Response

  // Görsel varsa photos endpoint, yoksa feed
  if (draft.image_url) {
    fbResponse = await fetch(
      `${GRAPH}/${pageId}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url:          draft.image_url,
          message:      caption,
          access_token: pageToken,
        }),
      },
    )
  } else {
    fbResponse = await fetch(
      `${GRAPH}/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:      caption,
          access_token: pageToken,
        }),
      },
    )
  }

  const fbData = await fbResponse.json()

  if (!fbResponse.ok || fbData.error) {
    const msg = fbData.error?.message ?? 'Facebook API hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Durumu 'posted' yap
  await supabase
    .from('content_drafts')
    .update({
      status:    'posted',
      platforms: ['facebook'],
    })
    .eq('id', draftId)

  return NextResponse.json({ ok: true, fbPostId: fbData.id ?? fbData.post_id })
}
