import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { getSocialToken } from '@/lib/vault'

const GRAPH = 'https://graph.facebook.com/v21.0'

/**
 * Instagram Business hesabına görsel paylaşır.
 *
 * Graph API iki adımlı çalışır:
 *   1. /{ig-user-id}/media        → medya container oluştur (creation_id döner)
 *   2. /{ig-user-id}/media_publish → container'ı yayınla (ig_media_id döner)
 *
 * Instagram Business hesabı bir Facebook Sayfasına bağlı olmalıdır.
 * Token olarak Facebook Sayfası token'ı kullanılır (Meta OAuth'ta zaten kaydedilmiş).
 */
export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await req.json()
  if (!draftId) return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 })

  const supabase = createServiceClient()
  const orgId    = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  // ── Draft ─────────────────────────────────────────────────────────────────────
  const { data: draft, error: draftErr } = await supabase
    .from('content_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('organization_id', orgId)
    .single()

  if (draftErr || !draft) return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 })
  if (draft.status !== 'approved') return NextResponse.json({ error: 'Sadece onaylı taslaklar paylaşılabilir' }, { status: 400 })
  if (!draft.image_url) return NextResponse.json({ error: 'Instagram paylaşımı için görsel zorunlu' }, { status: 400 })

  // ── Instagram hesabı ──────────────────────────────────────────────────────────
  const { data: igAccount } = await supabase
    .from('social_accounts')
    .select('id, platform_account_id, access_token_vault_id, access_token, metadata')
    .eq('organization_id', orgId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .single()

  if (!igAccount) {
    return NextResponse.json({
      error: 'Bağlı Instagram hesabı bulunamadı. Sosyal Medya sayfasından hesabını bağla.',
    }, { status: 404 })
  }

  // Token al (vault önce, fallback plaintext)
  const pageToken = await getSocialToken(igAccount)
  if (!pageToken) return NextResponse.json({ error: 'Instagram token okunamadı' }, { status: 500 })

  const igUserId = igAccount.platform_account_id

  // ── Caption ───────────────────────────────────────────────────────────────────
  const caption = [
    draft.caption_fi,
    draft.hashtags?.length ? draft.hashtags.map((h: string) => `#${h}`).join(' ') : '',
  ].filter(Boolean).join('\n\n')

  try {
    // ── Adım 1: Medya container oluştur ─────────────────────────────────────────
    const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url:    draft.image_url,
        caption,
        access_token: pageToken,
      }),
    })

    const containerData = await containerRes.json()

    if (!containerRes.ok || containerData.error) {
      const msg = containerData.error?.message ?? 'Medya container oluşturulamadı'
      console.error('IG container hatası:', containerData.error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const creationId: string = containerData.id
    if (!creationId) {
      return NextResponse.json({ error: 'creation_id alınamadı' }, { status: 500 })
    }

    // ── Adım 2: Container'ı yayınla ─────────────────────────────────────────────
    // Bazen container hazırlanması birkaç saniye sürer — kısa bekle
    await new Promise(r => setTimeout(r, 2000))

    const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id:  creationId,
        access_token: pageToken,
      }),
    })

    const publishData = await publishRes.json()

    if (!publishRes.ok || publishData.error) {
      const msg = publishData.error?.message ?? 'Medya yayınlanamadı'
      console.error('IG publish hatası:', publishData.error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const igMediaId: string = publishData.id

    // ── Draft durumunu güncelle ───────────────────────────────────────────────────
    await supabase
      .from('content_drafts')
      .update({ status: 'posted' })
      .eq('id', draftId)

    // ── Posts tablosuna kayıt ─────────────────────────────────────────────────────
    await supabase.from('posts').upsert(
      {
        organization_id:   orgId,
        draft_id:          draftId,
        social_account_id: igAccount.id ?? null,
        platform:          'instagram',
        platform_post_id:  igMediaId,
        caption,
        hashtags:          draft.hashtags ?? [],
        image_url:         draft.image_url ?? null,
        status:            'posted',
        posted_at:         new Date().toISOString(),
      },
      { onConflict: 'platform_post_id' },
    )

    return NextResponse.json({ ok: true, igMediaId })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    console.error('Instagram paylaşım hatası:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
