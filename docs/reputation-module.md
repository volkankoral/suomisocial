# Occaly — İtibar Modülü (Reputation Module) Mimarisi

> Google Haritalar / Facebook / Instagram yorumlarını çeken, AI ile cevaplayan,
> olumsuzları kullanıcıya bildiren ve yüksek puanlı yorumları müşterinin web
> sitesine widget olarak yansıtan modül.
>
> Tasarım ilkesi: **tek veri hattı, üç çıktı.** Yorumlar bir kez çekilir, üç
> farklı yerde değerlendirilir (otomatik cevap, olumsuz bildirimi, web widget).
>
> Tüm parçalar mevcut altyapıyı yeniden kullanır: `social_accounts`,
> `content_drafts` onay akışı, `lib/vault`, Groq, Vercel cron, Resend email.

---

## 1. Genel akış

```
                    ┌─────────────────────────────────────────┐
   Google (poll) ──▶│         /api/reviews/sync (cron)         │
   FB/IG (webhook)─▶│         /api/webhooks/meta               │
                    └────────────────────┬────────────────────┘
                                         ▼
                                  reviews tablosu  ◀── tek veri kaynağı
                          ┌──────────────┴───────────────┐
                          ▼                              ▼
              ┌───────────────────────┐     ┌──────────────────────────┐
              │  Sentiment + AI cevap │     │  Public Widget endpoint  │
              │  (Groq llama-3.3)     │     │  /api/widget/reviews/[id]│
              └───────────┬───────────┘     └────────────┬─────────────┘
              pozitif ────┤ negatif                       ▼
                  │       └──▶ email + uygulama bildirimi   müşterinin sitesi
                  ▼            "olumsuz yorum, taslak hazır"   <script> embed
            otomatik/onaylı cevap post
```

---

## 2. Veritabanı — `032_reviews.sql`

Tek tablo hem Google yıldız yorumlarını hem FB/IG yorumlarını taşır:

```sql
CREATE TABLE reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  social_account_id  uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform           text NOT NULL CHECK (platform IN ('google_business','facebook','instagram')),
  platform_review_id text NOT NULL,              -- dış id (idempotency)
  author_name        text,
  author_avatar_url  text,
  rating             integer,                    -- 1-5 (FB/IG yorumda null)
  comment_text       text,
  sentiment          text CHECK (sentiment IN ('positive','neutral','negative')),
  reply_text         text,                       -- AI taslağı / gönderilen cevap
  reply_status       text NOT NULL DEFAULT 'none'
                     CHECK (reply_status IN ('none','drafted','approved','posted','skipped')),
  reply_posted_at    timestamptz,
  is_featured        boolean DEFAULT false,      -- widget'ta göster
  review_created_at  timestamptz,                -- müşterinin yazdığı an
  metadata           jsonb DEFAULT '{}',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (platform, platform_review_id)
);
```

Ek olarak org başına ayar tablosu — `reputation_settings`:

| Kolon | Açıklama |
|---|---|
| `auto_reply_enabled` | Otomatik cevap açık/kapalı |
| `auto_reply_mode` | `off` / `draft` / `auto` |
| `notify_email` | Olumsuz yorum bildirimi adresi |
| `widget_min_rating` | Widget'ta gösterilecek min yıldız (default 4) |
| `widget_max_count` | Widget'ta max yorum adedi |
| `widget_theme` | `light` / `dark` |

RLS + `updated_at` trigger desenleri `031_agent.sql`'deki ile birebir aynı
(org member + service_role policy, `update_updated_at_column` trigger).

---

## 3. Endpoint'ler

| Endpoint | Tip | İş |
|---|---|---|
| `GET /api/reviews/sync` | Cron | Bağlı GBP hesaplarından yorumları çek (Google webhook yok → **polling**) |
| `POST /api/webhooks/meta` | Webhook | FB/IG yorum olaylarını gerçek zamanlı al |
| `GET /api/reviews` | Auth | Dashboard listesi (filtre: platform, sentiment, reply_status) |
| `POST /api/reviews/[id]/reply` | Auth | AI taslak üret **veya** onaylanmış cevabı platforma gönder |
| `PATCH /api/reviews/[id]` | Auth | Onayla / düzenle / atla / featured işaretle |
| `GET /api/widget/reviews/[orgId]` | **Public** | Cache'li, min_rating filtreli JSON (widget tüketir) |
| `GET /embed/reviews/[orgId]` | **Public** | Gömülebilir hafif HTML/JS render |

---

## 4. Yeniden kullanılan mevcut kod

| İhtiyaç | Mevcut kod |
|---|---|
| GBP token + yorum API | `lib/google-business.ts` → `getValidGoogleToken()`, `GBP_V4_API` (`mybusiness.googleapis.com/v4/.../reviews`) |
| Token şifreleme | `lib/vault` (`readToken` / `upsertToken`) |
| Bağlı hesaplar | `social_accounts` tablosu (platform + vault id zaten tutuluyor) |
| Sentiment + cevap üretimi | `lib/ai/generate-content.ts` deseni + Groq `llama-3.3-70b` |
| Email bildirimi | `lib/email` → `layout()` / `btn()` + yeni `sendNegativeReviewAlert()` |
| Zamanlanmış çekme | `vercel.json` crons (yeni satır: `/api/reviews/sync`) |
| Abuse koruması | `lib/rate-limit.ts` |
| Onay akışı UX | `content_drafts` pending→approve→publish deseni kopyalanır |
| Webhook imza doğrulama | `stripe/webhook/route.ts` deseni referans |

---

## 5. AI katmanı (iki ucuz çağrı)

1. **Sentiment** — ucuz/hızlı sınıflama: yorum → `positive` / `neutral` / `negative`.
   Düşük token, Groq.
2. **Cevap üretimi** — marka tonuyla (`brand_settings`), **yorumun içeriğine özgü**
   (müşterinin bahsettiği ürünü/şikayeti referans alan), org diliyle
   (mevcut `getContentLang` sistemi).

Negatifte AI yine taslak üretir ama `reply_status='drafted'` kalır,
**asla otomatik post etmez** — kullanıcı onaylar.

---

## 6. Webhook vs polling

- **Google**: yorum webhook'u **yok** → cron ile periyodik polling (örn. saatte bir).
- **Meta (FB/IG)**: gerçek zamanlı **webhook var** → `POST /api/webhooks/meta`.

---

## 7. Widget (en çok retention katan parça)

- `<script src="https://occaly.com/widget.js" data-org="...">` müşteri sitesine yapıştırır
- Async yüklenir, siteyi yavaşlatmaz, Shadow DOM ile stil çakışması olmaz
- Veriyi `GET /api/widget/reviews/[orgId]`'den çeker (CDN cache'li)
- Tema / min yıldız / max adet `reputation_settings`'ten
- **Google ToS uyumu**: yorum metni değiştirilmez, yazar adı + fotoğraf + Google'a link zorunlu
- Retention etkisi: widget siteye gömüldükten sonra müşterinin Occaly'den ayrılması
  zorlaşır (switching cost) → abonelik iptalini düşürür

---

## 8. Fazlama — neyi şimdi, neyi onay sonrası

### 🟢 Faz 0 — ŞİMDİ (dış onay gerektirmez)
- `032_reviews.sql` + `reputation_settings` migration
- Sentiment + cevap-üretim AI servisleri
- Dashboard UI (yorum listesi, taslak onay ekranı)
- Email + uygulama içi bildirim sistemi
- **Widget — Places API ile**: Place ID'si olan herhangi bir işletmenin halka açık
  yorumları (OAuth gerekmez, GBP onayı beklemez, çağrı başına ücretli, max 5 yorum).
  Widget **bugün canlıya çıkabilir.**

### 🟡 Faz 1 — Google kota onayı düştüğünde (Case 1-0742000041045)
- GBP polling ile **tüm** yorumları çek (5 değil, hepsi → filtreleyip featured)
- Yorumlara API'den cevap gönderme aktifleşir
- Widget GBP verisine geçer (tam yorum havuzu)

### 🟡 Faz 2 — Meta App Review düştüğünde
- FB/IG yorum webhook'ları + cevap gönderme aktifleşir

> Faz 0'da kurulan sistem, onaylar düştükçe **kendiliğinden canlanır** — boşa bekleme yok.

---

## 9. Riskler / dikkat

- **Otomatik post'a temkinli başla**: pozitiflerde bile başta `draft` modu, güven oluşunca `auto`
- **Genel cevap tuzağı**: aynı 50 yoruma aynı cevap → ters teper; içeriğe özgü üretim şart
- **ToS**: Meta otomasyonu + Google gösterim kuralları erişimi riske atabilir — kurallara sıkı uy
- **Maliyet**: sentiment ucuz modelle, cevap kaliteli modelle ayrılır; Places API çağrıları cache'lenir

---

## 10. Bağımlılıklar (production için)

| Platform | Gereksinim | Durum |
|---|---|---|
| Google Business yorumları | GBP API kota onayı | Case `1-0742000041045` (bekliyor, 7-10 iş günü) |
| Google Places widget (Faz 0) | Places API key (Google Cloud) | Aktifleştirilebilir |
| Facebook/Instagram yorumları | Meta App Review + Business Verification | Bekliyor |
