/**
 * Kırık Replicate/Pollinations CDN URL'lerini temizle
 *
 * Replicate CDN URL'leri ~1 saat içinde sürüyor.
 * Bu script:
 *   1. content_drafts içindeki tüm replicate.delivery / pollinations.ai URL'lerini bulur
 *   2. Her birini fetch ederek gerçekten kırık mı kontrol eder
 *   3. Kırıkları → image_url = NULL yapar (frontend placeholder gösterir)
 *
 * Çalıştırma:
 *   node scripts/fix-broken-images.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY env değişkenleri gerekli')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function isUrlBroken(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    return !res.ok // 4xx / 5xx → kırık
  } catch {
    return true // timeout / network error → kırık say
  }
}

async function main() {
  console.log('🔍  Replicate ve Pollinations URL\'leri taranıyor...\n')

  // Süresi dolmuş olabilecek URL'leri çek
  const { data: rows, error } = await supabase
    .from('content_drafts')
    .select('id, image_url, organization_id, special_day_label, created_at')
    .or('image_url.like.%replicate.delivery%,image_url.like.%pbxt.replicate.delivery%,image_url.like.%image.pollinations.ai%')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌  Sorgu hatası:', error.message)
    process.exit(1)
  }

  if (!rows?.length) {
    console.log('✅  Kontrol edilecek geçici URL bulunamadı — hepsi zaten Storage\'da.')
    return
  }

  console.log(`📋  Toplam ${rows.length} taslak kontrol edilecek...\n`)

  let brokenCount  = 0
  let okCount      = 0
  const brokenIds  = []

  for (const row of rows) {
    process.stdout.write(`  ⏳  [${row.special_day_label ?? row.id.slice(0,8)}] kontrol ediliyor... `)
    const broken = await isUrlBroken(row.image_url)

    if (broken) {
      process.stdout.write('💔  KIRIK\n')
      brokenIds.push(row.id)
      brokenCount++
    } else {
      process.stdout.write('✅  OK\n')
      okCount++
    }
  }

  console.log(`\n📊  Sonuç: ${brokenCount} kırık, ${okCount} sağlam`)

  if (!brokenIds.length) {
    console.log('\n🎉  Temizlenecek kırık görsel yok!')
    return
  }

  console.log(`\n🧹  ${brokenIds.length} taslağın image_url alanı temizleniyor...`)

  // Batch olarak NULL yap (frontend placeholder/yeniden oluştur gösterebilir)
  const BATCH = 50
  let cleared = 0
  for (let i = 0; i < brokenIds.length; i += BATCH) {
    const batch = brokenIds.slice(i, i + BATCH)
    const { error: upErr } = await supabase
      .from('content_drafts')
      .update({ image_url: null })
      .in('id', batch)

    if (upErr) {
      console.error(`  ❌  Batch ${i}-${i+BATCH} güncellenemedi:`, upErr.message)
    } else {
      cleared += batch.length
      console.log(`  ✅  ${cleared}/${brokenIds.length} temizlendi`)
    }
  }

  console.log(`\n✨  Tamamlandı! ${cleared} kırık görsel temizlendi.`)
  console.log('   → Bu taslaklar artık "görsel yok" olarak görünecek.')
  console.log('   → Yeniden üretmek için taslak sayfasından içerik yenilenebilir.')
}

main().catch(err => {
  console.error('❌  Script hatası:', err)
  process.exit(1)
})
