import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export const maxDuration = 30

/**
 * POST /api/upload
 * FormData:
 *   file  — the file to upload
 *   type  — 'brand-logo' | 'post-media'
 *
 * Returns: { url: string }
 */
export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file) return NextResponse.json({ error: 'Dosya eksik' }, { status: 400 })
  if (!type || !['brand-logo', 'post-media'].includes(type)) {
    return NextResponse.json({ error: 'Geçersiz tür (brand-logo veya post-media)' }, { status: 400 })
  }

  // Size limits
  const maxSize = type === 'post-media' ? 50 * 1024 * 1024 : 5 * 1024 * 1024 // 50 MB video, 5 MB logo
  if (file.size > maxSize) {
    return NextResponse.json({
      error: `Dosya çok büyük (max ${maxSize / 1024 / 1024} MB)`,
    }, { status: 400 })
  }

  // Allowed MIME types
  const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  const videoMimes = ['video/mp4', 'video/quicktime', 'video/webm']
  const allowed = type === 'brand-logo' ? imageMimes : [...imageMimes, ...videoMimes]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: `Desteklenmeyen format: ${file.type}` }, { status: 400 })
  }

  const mediaType = videoMimes.includes(file.type) ? 'video' : 'image'

  // Build storage path: {bucket}/{orgId}/{timestamp}-{filename}
  const bucket = type === 'brand-logo' ? 'brand-assets' : 'post-media'
  const ext = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const path = `${orgId}/${timestamp}.${ext}`

  const supabase = createServiceClient()

  const arrayBuf = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuf, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl, mediaType })
}
