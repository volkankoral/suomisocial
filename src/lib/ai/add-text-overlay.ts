/**
 * Üretilen görselin üzerine marka adı + etiket yazar,
 * sonucu Supabase Storage'a yükler ve public URL döner.
 *
 * Düzen:
 *   - Görselin alt %18'i: soldan sağa koyu gradient overlay
 *   - Alt-ortada: İşletme adı (büyük, beyaz, bold)
 *   - Biraz üstünde: Özel gün / rutin etiketi (küçük, yarı saydam)
 */

import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/service'

interface OverlayOptions {
  orgId:        string
  businessName: string
  label:        string        // Özel gün/rutin adı, örn. "Juhannus" veya "Hyvää viikonloppua"
  imageUrl:     string        // Kaynak görsel URL'i (AI üretilmiş veya kullanıcı yüklü)
  draftId?:     string        // Storage path için (opsiyonel)
}

export async function addTextOverlay(opts: OverlayOptions): Promise<string> {
  const { orgId, businessName, label, imageUrl } = opts

  // 1. Görseli indir
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Görsel indirilemedi: ${response.status}`)
  const imageBuffer = Buffer.from(await response.arrayBuffer())

  // 2. Görsel boyutlarını al
  const meta = await sharp(imageBuffer).metadata()
  const W = meta.width  ?? 1080
  const H = meta.height ?? 1080

  // 3. Alt gradient + metin SVG oluştur
  const gradientH  = Math.round(H * 0.22)   // alt %22
  const nameSize   = Math.max(32, Math.round(W * 0.042))
  const labelSize  = Math.max(22, Math.round(W * 0.028))
  const paddingB   = Math.round(H * 0.04)
  const lineGap    = Math.round(nameSize * 0.5)

  // İş adını ve etiketi sarmalayabiliriz (çok uzunsa kısalt)
  const maxChars   = Math.floor(W / (nameSize * 0.6))
  const safeName   = businessName.slice(0, maxChars)
  const safeLabel  = label.slice(0, maxChars + 10)

  const svgOverlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.72"/>
    </linearGradient>
  </defs>

  <!-- Alt gradient -->
  <rect x="0" y="${H - gradientH}" width="${W}" height="${gradientH}" fill="url(#g)"/>

  <!-- Etiket (özel gün adı) -->
  <text
    x="${W / 2}"
    y="${H - paddingB - nameSize - lineGap}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${labelSize}"
    font-weight="400"
    fill="rgba(255,255,255,0.78)"
    letter-spacing="1"
  >${safeLabel}</text>

  <!-- İşletme adı -->
  <text
    x="${W / 2}"
    y="${H - paddingB}"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${nameSize}"
    font-weight="700"
    fill="white"
    letter-spacing="1.5"
  >${safeName}</text>
</svg>`

  // 4. Görselle SVG'yi birleştir
  const outputBuffer = await sharp(imageBuffer)
    .composite([{
      input:   Buffer.from(svgOverlay),
      top:     0,
      left:    0,
      blend:   'over',
    }])
    .jpeg({ quality: 92 })
    .toBuffer()

  // 5. Supabase Storage'a yükle
  const supabase = createServiceClient()
  const path     = `${orgId}/${Date.now()}-overlay.jpg`

  const { error } = await supabase.storage
    .from('post-media')
    .upload(path, outputBuffer, {
      contentType: 'image/jpeg',
      upsert:      false,
    })

  if (error) throw new Error(`Storage yükleme hatası: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
  return publicUrl
}
