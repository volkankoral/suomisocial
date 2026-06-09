import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { getSocialToken } from '@/lib/vault'

/**
 * TikTok Content Posting API v2 — fotoğraf paylaşımı
 *
 * TikTok'un Content Posting API'si video ve fotoğrafı destekler.
 * Fotoğraf için media_type=PHOTO + source=PULL_FROM_URL kullanılır.
 * Gerekli scope: video.upload + video.publish
 *
 * Dokümantasyon: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  const supabase = createServiceClient()
  const body = await request.json() as { draftId?: string }
  const draftId = body.draftId

  if (!draftId) return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 })

  // ── Draft ─────────────────────────────────────────────────────────────────
  const { data: draft, error: draftErr } = await supabase
    .from('content_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('organization_id', orgId)
    .single()

  if (draftErr || !draft) {
    return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 })
  }
  if (draft.status !== 'approved') {
    return NextResponse.json({ error: 'Sadece onaylı taslaklar paylaşılabilir' }, { status: 400 })
  }
  if (!draft.image_url) {
    return NextResponse.json({ error: 'TikTok paylaşımı için görsel zorunlu' }, { status: 400 })
  }

  // ── TikTok hesabı ─────────────────────────────────────────────────────────
  const { data: account } = await supabase
    .from('social_accounts')
    .select('id, platform_account_id, access_token_vault_id, access_token, metadata')
    .eq('organization_id', orgId)
    .eq('platform', 'tiktok')
    .eq('is_active', true)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({
      error: 'Bağlı TikTok hesabı bulunamadı. Sosyal Medya sayfasından hesabını bağla.',
    }, { status: 404 })
  }

  const accessToken = await getSocialToken(account)
  if (!accessToken) {
    return NextResponse.json({ error: 'TikTok token okunamadı' }, { status: 500 })
  }

  // ── Caption (TikTok title = caption) ─────────────────────────────────────
  const caption = [
    draft.caption_fi,
    draft.hashtags?.length ? draft.hashtags.map((h: string) => `#${h}`).join(' ') : '',
  ].filter(Boolean).join('\n\n')

  // TikTok title max 150 karakter
  const title = caption.slice(0, 150)

  try {
    // ── Fotoğraf paylaşımı (Content Posting API v2) ────────────────────────
    const postRes = await fetch(`${TIKTOK_API}/post/publish/content/init/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        media_type: 'PHOTO',
        post_mode:  'DIRECT_POST',
        post_info: {
          title,
          privacy_level:   'PUBLIC_TO_EVERYONE',
          disable_duet:    false,
          disable_comment: false,
          disable_stitch:  false,
        },
        source_info: {
          source:             'PULL_FROM_URL',
          photo_images:       [draft.image_url],
          photo_cover_index:  0,
        },
      }),
    })

    const postData = await postRes.json()

    if (!postRes.ok || postData.error?.code !== 'ok') {
      const errMsg = postData.error?.message ?? postData.error?.code ?? 'TikTok paylaşım hatası'
      console.error('[post/tiktok] hata:', JSON.stringify(postData))
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    const publishId: string = postData.data?.publish_id ?? postData.data?.item_id ?? ''

    // ── Draft durumunu güncelle ────────────────────────────────────────────
    await supabase
      .from('content_drafts')
      .update({ status: 'posted' })
      .eq('id', draftId)

    // ── Posts tablosuna kayıt ──────────────────────────────────────────────
    await supabase.from('posts').upsert(
      {
        organization_id:   orgId,
        draft_id:          draftId,
        social_account_id: account.id,
        platform:          'tiktok',
        platform_post_id:  publishId || `tiktok_${draftId}_${Date.now()}`,
        caption,
        hashtags:          draft.hashtags ?? [],
        image_url:         draft.image_url ?? null,
        status:            'posted',
        posted_at:         new Date().toISOString(),
      },
      { onConflict: 'platform_post_id' },
    )

    return NextResponse.json({ ok: true, publishId })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    console.error('[post/tiktok] hata:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
