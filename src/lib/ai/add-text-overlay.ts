/**
 * Üretilen görselin üzerine marka adı + etiket yazar.
 *
 * Yöntem: @napi-rs/canvas (Skia tabanlı, sistem fontu gerektirmez)
 * Sharp SVG yerine Canvas API kullanılır — Vercel serverless'ta güvenilir çalışır.
 *
 * Düzen:
 *   - Alt %22: siyahtan şeffafa gradient overlay
 *   - Alt-ortada: İşletme adı (büyük, beyaz, bold)
 *   - Üstünde: Özel gün / rutin etiketi (küçük, yarı saydam)
 */

import path from 'path'
import sharp from 'sharp'
import { createCanvas, GlobalFonts, type Canvas } from '@napi-rs/canvas'
import { createServiceClient } from '@/lib/supabase/service'

interface OverlayOptions {
  orgId:        string
  businessName: string
  label:        string
  imageUrl:     string
  draftId?:     string
}

let fontsRegistered = false

function ensureFonts() {
  if (fontsRegistered) return
  try {
    const bold    = path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.woff')
    const regular = path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.woff')
    GlobalFonts.registerFromPath(bold,    'Inter')
    GlobalFonts.registerFromPath(regular, 'Inter')
  } catch {
    // Font yükleme başarısız — sistem sans-serif'e düşer
  }
  fontsRegistered = true
}

function drawOverlay(canvas: Canvas, businessName: string, label: string): void {
  const ctx = canvas.getContext('2d')
  const W   = canvas.width
  const H   = canvas.height

  // Gradient yüksekliği
  const gradH = Math.round(H * 0.28)

  // Alt gradient
  const grad = ctx.createLinearGradient(0, H - gradH, 0, H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.78)')
  ctx.fillStyle = grad
  ctx.fillRect(0, H - gradH, W, gradH)

  // Font boyutları
  const nameSize  = Math.max(32, Math.round(W * 0.042))
  const labelSize = Math.max(20, Math.round(W * 0.027))
  const paddingB  = Math.round(H * 0.05)
  const lineGap   = Math.round(nameSize * 0.6)

  // Metni kırp — çok uzunsa
  const maxWidth = W * 0.85

  // İşletme adı (bold, beyaz)
  ctx.font         = `bold ${nameSize}px Inter, Arial, sans-serif`
  ctx.fillStyle    = 'rgba(255,255,255,0.95)'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(businessName, W / 2, H - paddingB, maxWidth)

  // Etiket (regular, yarı saydam)
  ctx.font      = `${labelSize}px Inter, Arial, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(label, W / 2, H - paddingB - nameSize - lineGap + labelSize, maxWidth)
}

export async function addTextOverlay(opts: OverlayOptions): Promise<string> {
  const { orgId, businessName, label, imageUrl } = opts

  ensureFonts()

  // 1. Görseli indir
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Görsel indirilemedi: ${response.status}`)
  const imageBuffer = Buffer.from(await response.arrayBuffer())

  // 2. Görsel boyutlarını al
  const meta = await sharp(imageBuffer).metadata()
  const W = meta.width  ?? 1080
  const H = meta.height ?? 1080

  // 3. Canvas oluştur ve overlay çiz
  const canvas = createCanvas(W, H)
  drawOverlay(canvas, businessName, label)

  // 4. Canvas PNG → buffer
  const overlayBuffer = canvas.toBuffer('image/png')

  // 5. Sharp ile orijinal görsel + overlay birleştir
  const outputBuffer = await sharp(imageBuffer)
    .composite([{
      input: overlayBuffer,
      top:   0,
      left:  0,
      blend: 'over',
    }])
    .jpeg({ quality: 92 })
    .toBuffer()

  // 6. Supabase Storage'a yükle
  const supabase    = createServiceClient()
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
