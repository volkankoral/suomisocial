/**
 * Üretilen görselin üzerine marka adı + etiket yazar,
 * sonucu Supabase Storage'a yükler ve public URL döner.
 *
 * Düzen:
 *   - Görselin alt %22'si: koyu gradient overlay
 *   - Alt-ortada: İşletme adı (büyük, beyaz, bold)
 *   - Biraz üstünde: Özel gün / rutin etiketi (küçük, yarı saydam)
 *
 * Font: Inter (latin 700 + 400) — public/fonts/ klasöründen okunur,
 * SVG @font-face'e base64 data URI olarak gömülür.
 * Bu sayede Vercel serverless ortamında sistem fontu gerekmez.
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/service'

interface OverlayOptions {
  orgId:        string
  businessName: string
  label:        string
  imageUrl:     string
  draftId?:     string
}

/** Font dosyasını oku ve base64'e çevir (runtime'da bir kere yapılır) */
function loadFontBase64(filename: string): string {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', filename)
  try {
    const buf = fs.readFileSync(fontPath)
    return buf.toString('base64')
  } catch {
    return ''
  }
}

export async function addTextOverlay(opts: OverlayOptions): Promise<string> {
  const { orgId, businessName, label, imageUrl } = opts

  // 1. Fontları yükle
  const boldB64    = loadFontBase64('Inter-Bold.woff')
  const regularB64 = loadFontBase64('Inter-Regular.woff')

  // 2. Görseli indir
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Görsel indirilemedi: ${response.status}`)
  const imageBuffer = Buffer.from(await response.arrayBuffer())

  // 3. Görsel boyutlarını al
  const meta = await sharp(imageBuffer).metadata()
  const W = meta.width  ?? 1080
  const H = meta.height ?? 1080

  // 4. Ölçüler
  const gradientH = Math.round(H * 0.22)
  const nameSize  = Math.max(32, Math.round(W * 0.042))
  const labelSize = Math.max(20, Math.round(W * 0.026))
  const paddingB  = Math.round(H * 0.045)
  const lineGap   = Math.round(nameSize * 0.55)

  const maxChars = Math.floor(W / (nameSize * 0.6))
  const safeName = businessName.slice(0, maxChars)
  const safeLabel = label.slice(0, maxChars + 10)

  // 5. SVG — font @font-face olarak embed ediliyor
  const fontFace = boldB64 ? `
    @font-face {
      font-family: 'Inter';
      font-weight: 700;
      src: url('data:font/woff;base64,${boldB64}') format('woff');
    }
    @font-face {
      font-family: 'Inter';
      font-weight: 400;
      src: url('data:font/woff;base64,${regularB64}') format('woff');
    }
  ` : ''

  const svgOverlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>${fontFace}</style>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
    </linearGradient>
  </defs>

  <!-- Alt gradient -->
  <rect x="0" y="${H - gradientH}" width="${W}" height="${gradientH}" fill="url(#g)"/>

  <!-- Etiket -->
  <text
    x="${W / 2}"
    y="${H - paddingB - nameSize - lineGap}"
    text-anchor="middle"
    font-family="Inter, Arial, sans-serif"
    font-size="${labelSize}"
    font-weight="400"
    fill="rgba(255,255,255,0.80)"
    letter-spacing="0.5"
  >${safeLabel}</text>

  <!-- İşletme adı -->
  <text
    x="${W / 2}"
    y="${H - paddingB}"
    text-anchor="middle"
    font-family="Inter, Arial, sans-serif"
    font-size="${nameSize}"
    font-weight="700"
    fill="white"
    letter-spacing="1"
  >${safeName}</text>
</svg>`

  // 6. Görselle birleştir
  const outputBuffer = await sharp(imageBuffer)
    .composite([{
      input: Buffer.from(svgOverlay),
      top:   0,
      left:  0,
      blend: 'over',
    }])
    .jpeg({ quality: 92 })
    .toBuffer()

  // 7. Supabase Storage'a yükle
  const supabase = createServiceClient()
  const storagePath = `${orgId}/${Date.now()}-overlay.jpg`

  const { error } = await supabase.storage
    .from('post-media')
    .upload(storagePath, outputBuffer, {
      contentType: 'image/jpeg',
      upsert:      false,
    })

  if (error) throw new Error(`Storage yükleme hatası: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(storagePath)
  return publicUrl
}
