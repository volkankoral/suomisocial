-- ============================================================
-- SaaS Planları, Abonelikler ve Kupon Sistemi
-- ============================================================

-- Plans tablosu (admin tarafından yönetilir)
CREATE TABLE IF NOT EXISTS plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,                     -- "Starter", "Pro", "Business"
  slug             text NOT NULL UNIQUE,              -- "starter", "pro", "business"
  description      text,
  price_monthly    numeric(10,2) NOT NULL DEFAULT 0,  -- EUR
  price_yearly     numeric(10,2),                     -- EUR (yıllık indirimli)
  features         jsonb DEFAULT '[]',                -- ["5 post/ay", "1 hesap", ...]
  limits           jsonb DEFAULT '{}',                -- {"posts": 5, "accounts": 1, "ai_credits": 10}
  stripe_price_id_monthly  text,
  stripe_price_id_yearly   text,
  is_active        boolean DEFAULT true,
  is_featured      boolean DEFAULT false,             -- "En popüler" badge
  sort_order       integer DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Subscriptions tablosu
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                 uuid NOT NULL REFERENCES plans(id),
  status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  billing_cycle           text NOT NULL DEFAULT 'monthly'
                            CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  trial_ends_at           timestamptz,
  canceled_at             timestamptz,
  stripe_customer_id      text,
  stripe_subscription_id  text UNIQUE,
  -- Admin tarafından elle ayarlanan ücretsiz/özel abonelik
  is_manual               boolean DEFAULT false,
  manual_note             text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Coupons tablosu
CREATE TABLE IF NOT EXISTS coupons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  description       text,
  -- İndirim türü
  discount_type     text NOT NULL DEFAULT 'percent'
                      CHECK (discount_type IN ('percent', 'fixed')),
  discount_value    numeric(10,2) NOT NULL,           -- % veya EUR
  -- Kısıtlamalar
  applies_to_plan   uuid REFERENCES plans(id),        -- NULL = tüm planlar
  applies_to_email  text,                             -- NULL = herkes, belirtilirse sadece o kullanıcı
  max_uses          integer,                          -- NULL = sınırsız
  used_count        integer DEFAULT 0,
  expires_at        timestamptz,
  -- Stripe
  stripe_coupon_id  text,
  stripe_promo_id   text,
  is_active         boolean DEFAULT true,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now()
);

-- Coupon kullanım geçmişi
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       uuid NOT NULL REFERENCES coupons(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id         uuid REFERENCES auth.users(id),
  redeemed_at     timestamptz DEFAULT now()
);

-- Admin flag organizations tablosuna ekle
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Updated_at trigger'ları
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Plans: herkes okuyabilir (aktif olanları)
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "plans_admin_all" ON plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = auth.uid() AND o.is_admin = true
    )
  );

-- Subscriptions: kendi org'unu görürsün
CREATE POLICY "subscriptions_org_read" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "subscriptions_admin_all" ON subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = auth.uid() AND o.is_admin = true
    )
  );

-- Coupons: admin yönetir
CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = auth.uid() AND o.is_admin = true
    )
  );

-- Kupon geçerliliğini kontrol: kullanıcı kendi e-postasına verilen kuponu görebilir
CREATE POLICY "coupons_user_read" ON coupons
  FOR SELECT USING (
    is_active = true AND (
      applies_to_email IS NULL OR
      applies_to_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- İndeksler
CREATE INDEX idx_subscriptions_org    ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_coupons_code         ON coupons(code);

-- Varsayılan planlar
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, features, limits, is_active, is_featured, sort_order)
VALUES
  (
    'Starter', 'starter',
    'Küçük işletmeler için başlangıç paketi',
    29.00, 290.00,
    '["1 sosyal medya hesabı", "Ayda 20 AI içerik", "Meta & Google Ads izleme", "Email destek"]',
    '{"posts_per_month": 20, "social_accounts": 1, "ai_credits": 20, "team_members": 1}',
    true, false, 1
  ),
  (
    'Pro', 'pro',
    'Büyüyen işletmeler için profesyonel paket',
    79.00, 790.00,
    '["3 sosyal medya hesabı", "Ayda 100 AI içerik", "TikTok dahil tüm platformlar", "Reklam optimizasyon önerileri", "Öncelikli destek"]',
    '{"posts_per_month": 100, "social_accounts": 3, "ai_credits": 100, "team_members": 3}',
    true, true, 2
  ),
  (
    'Business', 'business',
    'Ajanslar ve büyük işletmeler için',
    199.00, 1990.00,
    '["Sınırsız hesap", "Sınırsız AI içerik", "AI reklam optimizasyonu", "Ekip yönetimi", "Özel entegrasyonlar", "Dedicated destek"]',
    '{"posts_per_month": -1, "social_accounts": -1, "ai_credits": -1, "team_members": -1}',
    true, false, 3
  );
