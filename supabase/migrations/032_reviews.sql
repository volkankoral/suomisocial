-- 032_reviews.sql
-- İtibar Modülü: Google Business / Facebook / Instagram yorumları,
-- AI otomatik cevap taslakları ve web widget için.

-- ── Yorumlar ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  social_account_id  uuid        REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform           text        NOT NULL CHECK (platform IN ('google_business','facebook','instagram')),
  platform_review_id text        NOT NULL,              -- dış platform id (idempotency)
  author_name        text,
  author_avatar_url  text,
  rating             integer     CHECK (rating BETWEEN 1 AND 5),  -- FB/IG yorumda null
  comment_text       text,
  sentiment          text        CHECK (sentiment IN ('positive','neutral','negative')),
  reply_text         text,                       -- AI taslağı veya gönderilen cevap
  reply_status       text        NOT NULL DEFAULT 'none'
                                 CHECK (reply_status IN ('none','drafted','approved','posted','skipped')),
  reply_posted_at    timestamptz,
  is_featured        boolean     NOT NULL DEFAULT false,  -- widget'ta göster
  review_created_at  timestamptz,                         -- müşterinin yazdığı an
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_review_id)
);

-- ── Org başına itibar yönetimi ayarları ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS reputation_settings (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid    NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  auto_reply_enabled   boolean NOT NULL DEFAULT false,
  -- 'off'   → hiç cevap yazma
  -- 'draft' → AI taslak üret, kullanıcı onaylar (pozitif dahil)
  -- 'auto'  → pozitif/nötrü otomatik gönder, negatifi kullanıcıya eskalat
  auto_reply_mode      text    NOT NULL DEFAULT 'draft'
                               CHECK (auto_reply_mode IN ('off','draft','auto')),
  notify_email         text,            -- olumsuz yorum bildirimi adresi (null → org owner email)
  widget_enabled       boolean NOT NULL DEFAULT true,
  widget_min_rating    integer NOT NULL DEFAULT 4 CHECK (widget_min_rating BETWEEN 1 AND 5),
  widget_max_count     integer NOT NULL DEFAULT 10,
  widget_theme         text    NOT NULL DEFAULT 'dark' CHECK (widget_theme IN ('light','dark','auto')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── İndeksler ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_org          ON reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform     ON reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment    ON reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_reviews_reply_status ON reviews(reply_status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_featured  ON reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_rating       ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created      ON reviews(review_created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_settings  ENABLE ROW LEVEL SECURITY;

-- reviews: org üyesi okuyup yazabilir
CREATE POLICY "org member own reviews"
  ON reviews FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- reviews: widget için public SELECT (is_featured + rating filtresi API katmanında yapılır)
CREATE POLICY "public read featured reviews"
  ON reviews FOR SELECT TO anon
  USING (is_featured = true);

-- reputation_settings: org üyesi okuyup yazabilir
CREATE POLICY "org member own reputation settings"
  ON reputation_settings FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- service_role: her ikisine de tam erişim (cron + webhook handler'lar için)
CREATE POLICY "service role reviews"
  ON reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role reputation settings"
  ON reputation_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── updated_at trigger'ları ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_reputation_settings_updated_at
    BEFORE UPDATE ON reputation_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
