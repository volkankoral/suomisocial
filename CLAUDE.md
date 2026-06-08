# Occaly — AI Sosyal Medya & Reklam Otomasyon Platformu

**Proje klasörü:** `C:\Users\GoldenPizzeria\Projects\suomisocial`
**Canlı URL:** https://occaly.com
**GitHub:** volkankoral/suomisocial → main → Vercel auto-deploy
**Supabase proje ID:** bsyatpkxpxzkhzkmvxiv

---

## Stack

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind v4 + shadcn/ui |
| DB | Supabase Postgres (RLS multi-tenant) |
| Auth | Supabase Auth |
| Görsel AI | Replicate FLUX 1.1 Pro (admin) / Pollinations.ai (free) |
| Metin AI | Groq Llama 3.3 70B |
| Görsel overlay | `@napi-rs/canvas` + Sharp |
| Sosyal medya | Meta Graph API v21 (IG + FB), TikTok Content API |
| Ödeme | Stripe |
| Hosting | Vercel |

---

## Kritik Kurallar

- **Multi-tenant:** Her tabloda `organization_id` var, RLS aktif. Service client ile yazarken org check zorunlu.
- **Kullanıcı onayı:** Tam otomatik post yok. İçerik → taslak → onay → yayın.
- **Maliyet:** FLUX Pro sadece `organizations.is_admin = true` için.
- **Build kritik:** `@napi-rs/canvas` ve `sharp` → `next.config.ts`'de `serverExternalPackages`'ta. Kaldırılırsa Vercel build bozulur.
- **i18n:** `src/lib/translations.ts` dosyasında TR/FI/EN/SV. Yeni string eklenince üç dile de eklenmeli.
- **params async:** Next.js 16'da `await params` zorunlu.

---

## Tamamlanan Fazlar (2026-05 itibarıyla)

- ✅ Faz 0: Foundation (Next.js + Supabase + Auth + layout)
- ✅ Faz 1: Finnish Calendar (tatiller + nimipäivä)
- ✅ Faz 2: AI içerik üretimi (Groq caption + FLUX/Pollinations görsel + draft yönetimi)
- ✅ Faz 3: Meta OAuth, IG + FB post sync, engagement metrikleri
- ✅ Extras: FLUX Pro admin, CSS metin şablonları (picker), Stripe abonelik, Reklamlar sayfası

## Devam Eden

- 🔄 TikTok post gönderme — OAuth çalışıyor, Vercel→TikTok API bloklu
- 🔄 Google Business post — API başvurusu lazım
- ⏳ AI reklam optimizasyonu (haftalık rapor)
- ⏳ Landing page

---

## Kritik Dosyalar

```
src/
├── app/
│   ├── [lang]/(dashboard)/
│   │   ├── content/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── _components/
│   │   │       ├── EditDraftModal.tsx       ← şablon picker buraya entegre
│   │   │       ├── TextTemplatePicker.tsx   ← 7 CSS overlay şablonu
│   │   │       ├── ImageOverlayPreview.tsx  ← canlı önizleme
│   │   │       └── overlayTemplates.ts      ← şablon tanımları
│   │   ├── posts/        ← yayın geçmişi + metrikler
│   │   ├── social/       ← hesap bağlantıları
│   │   ├── ads/          ← reklam izleme
│   │   ├── brand/        ← marka ayarları
│   │   └── billing/      ← Stripe abonelik
│   └── api/
│       ├── content/generate-v2/
│       ├── drafts/[id]/
│       ├── posts/sync/
│       └── oauth/meta|tiktok|google-business/
├── lib/
│   ├── ai/generate-content.ts   ← Groq caption
│   ├── ai/generate-image.ts     ← FLUX/Pollinations
│   ├── ai/add-text-overlay.ts   ← @napi-rs/canvas
│   ├── supabase/server.ts       ← user client (RLS)
│   ├── supabase/service.ts      ← service client (bypass)
│   ├── translations.ts          ← i18n
│   └── vault.ts                 ← token şifre çözme
next.config.ts                   ← serverExternalPackages kritik
```

---

## Bilinen Sorunlar

| Sorun | Durum |
|---|---|
| TikTok post — Vercel → TikTok API ulaşamıyor | Açık |
| Google Business API erişimi | Başvuru gerekiyor |
| Yayınlar metrikleri 0 | FB token scope sorunu, bağlantı yenilenince düzeliyor |
