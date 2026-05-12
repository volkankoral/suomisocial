import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  const supabase = createServiceClient()
  const body = await request.json()

  // Support both direct posting and draft-based posting
  let caption: string
  let video_url: string | null
  let thumbnail_url: string | undefined
  let draftId: string | undefined

  if (body.draftId) {
    // Draft-based posting
    draftId = body.draftId
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

    caption = [
      draft.caption_fi,
      draft.hashtags?.length ? draft.hashtags.map((h: string) => `#${h}`).join(' ') : '',
    ].filter(Boolean).join('\n\n')

    // TikTok requires video, but we have image. For now, we'll create a simple video from the image
    // or return an error asking for video upload
    if (draft.image_url && !draft.video_url) {
      return NextResponse.json({
        error: 'TikTok video gerekli. Şu anda sadece fotoğraf var. Video yükleyin veya Remotion ile video üretin.'
      }, { status: 400 })
    }

    video_url = draft.video_url
    thumbnail_url = draft.image_url || undefined
  } else {
    // Direct posting with explicit parameters
    const { caption: c, video_url: v, thumbnail_url: t } = body as {
      caption?: string
      video_url?: string
      thumbnail_url?: string
    }

    if (!c || !v) {
      return NextResponse.json({ error: 'Caption ve video_url gerekli' }, { status: 400 })
    }

    caption = c
    video_url = v
    thumbnail_url = t
  }

  try {
    const supabase = createServiceClient()

    // Get TikTok account token
    const { data: account } = await supabase
      .from('social_accounts')
      .select('access_token, platform_user_id')
      .eq('organization_id', orgId)
      .eq('platform', 'tiktok')
      .single()

    if (!account?.access_token) {
      return NextResponse.json({ error: 'TikTok hesabı bağlı değil' }, { status: 403 })
    }

    // Initialize upload (get upload URL from TikTok)
    const initResponse = await fetch('https://open.tiktokapi.com/v1/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.access_token}`,
      },
      body: JSON.stringify({
        source_info: {
          source: 'SCHEDULE_VIDEO',
          privacy_level: 'PUBLIC_TO_EVERYONE',
        },
      }),
    })

    if (!initResponse.ok) {
      const err = await initResponse.text()
      console.error('TikTok init error:', err)
      return NextResponse.json({ error: 'Failed to initialize upload' }, { status: 500 })
    }

    const { data: initData } = await initResponse.json()
    const uploadUrl = initData.upload_url
    const publishId = initData.publish_id

    // Upload video file
    const videoResponse = await fetch(video_url)
    const videoBuffer = await videoResponse.arrayBuffer()

    const uploadFormData = new FormData()
    uploadFormData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }))

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    })

    if (!uploadRes.ok) {
      console.error('TikTok upload error:', await uploadRes.text())
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 })
    }

    // Publish video
    const publishResponse = await fetch('https://open.tiktokapi.com/v1/post/publish/action/publish/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${account.access_token}`,
      },
      body: JSON.stringify({
        publish_id: publishId,
        post_info: {
          title: caption,
          cover: {
            type: 'FILE',
          },
        },
      }),
    })

    if (!publishResponse.ok) {
      const err = await publishResponse.text()
      console.error('TikTok publish error:', err)
      return NextResponse.json({ error: 'Failed to publish video' }, { status: 500 })
    }

    const { data: publishData } = await publishResponse.json()
    const tiktokVideoId = publishData.item_id

    // Update draft status if it's draft-based posting
    if (draftId) {
      await supabase
        .from('content_drafts')
        .update({
          status: 'posted',
          platforms: ['tiktok'],
        })
        .eq('id', draftId)
    }

    // Save to posts table
    const { data: post, error: saveError } = await supabase
      .from('posts')
      .insert({
        organization_id: orgId,
        draft_id: draftId || null,
        platform: 'tiktok',
        platform_account_id: account.platform_user_id,
        platform_post_id: tiktokVideoId,
        caption,
        media_url: video_url,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error('Database error:', saveError)
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
