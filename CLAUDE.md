@AGENTS.md

# SuomiSocial — Proje Rehberliği

Finlandiya'ya özgü özel günler için otomatik AI sosyal medya & reklam yönetimi platformu. Önce kullanıcının pizzeria'sı için MVP, sonra subscription bazlı SaaS.

Tam yol haritası ve onaylı plan: `C:\Users\GoldenPizzeria\.claude\plans\selam-bir-proje-d-n-yorum-graceful-cherny.md`

## Mimari Kuralları

- **Multi-tenant baştan**: Her domain tablosunda `organization_id` kolonu olmalı, RLS politikası ile diğer org datalarına erişim engellensin.
- **Düzenlenebilir taslak akışı**: AI üretir → kullanıcı düzenler/onaylar → sonra yayınlanır. Tam otomatik post YOK.
- **Düşük maliyetli AI**: FLUX schnell (görsel) + Remotion (video) + Claude Haiku (metin). DALL-E/Sora kullanma — pahalı.
- **i18n**: Tüm kullanıcı-yüzü metinler `src/dictionaries/{tr,en,fi}.json` içinde, hardcode etme. Native Next.js dictionary pattern kullanılıyor (next-intl değil).

## Stack

- Next.js 16 (App Router, src/, Turbopack)
- React 19, TypeScript 5, Tailwind v4
- Supabase (Postgres + Auth + Storage)
- Inngest (Faz 2'de eklenecek)
- Remotion (Faz 2)
- shadcn/ui

## Önemli Next.js 16 Farkları

- `middleware.ts` → **`proxy.ts`** olarak yeniden adlandırıldı.
- `params` artık async: her zaman `await params` yapılır.
- `PageProps<"/[lang]">` ve `LayoutProps<"/[lang]">` global TypeScript helper'ları var, manuel tip yazma.
- Detaylar için `node_modules/next/dist/docs/` klasörünü oku.

## Klasör Yapısı

```
src/
  app/
    [lang]/
      layout.tsx       # Root layout, html/body burada
      page.tsx         # Ana sayfa
    globals.css
  dictionaries/
    tr.json
    en.json
    fi.json
  dictionaries.ts      # getDictionary helper
  proxy.ts             # Locale routing (eski middleware.ts)
```

## Yapılma Şekli

- Adım adım, her adım deploy edilebilir/test edilebilir.
- Türkçe konuşan kullanıcı, açıklamalar Türkçe.
- Reklam/sosyal medya API'lerinde production'a almadan önce sandbox/test mode'da doğrulama zorunlu.
