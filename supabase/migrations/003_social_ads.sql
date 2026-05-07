-- ── SOSYAL MEDYA HESAPLARI ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform            text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
  platform_account_id text NOT NULL,
  platform_username   text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  is_active           boolean DEFAULT true,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(organization_id, platform, platform_account_id)
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_accounts_org" ON social_accounts
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER set_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── YAYINLANAN POST'LAR ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  draft_id            uuid REFERENCES content_drafts(id) ON DELETE SET NULL,
  social_account_id   uuid REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform            text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
  platform_post_id    text,
  caption             text,
  hashtags            text[] DEFAULT '{}',
  image_url           text,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'posted', 'failed')),
  posted_at           timestamptz,
  likes_count         int DEFAULT 0,
  comments_count      int DEFAULT 0,
  shares_count        int DEFAULT 0,
  reach               int DEFAULT 0,
  impressions         int DEFAULT 0,
  engagement_rate     numeric(5,2),
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_org" ON posts
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_posts_org      ON posts(organization_id);
CREATE INDEX idx_posts_platform ON posts(platform);
CREATE INDEX idx_posts_status   ON posts(status);
CREATE INDEX idx_posts_posted   ON posts(posted_at DESC);

-- ── REKLAM HESAPLARI ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform            text NOT NULL CHECK (platform IN ('google', 'meta', 'tiktok')),
  account_id          text NOT NULL,
  account_name        text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  is_active           boolean DEFAULT true,
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(organization_id, platform, account_id)
);

ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_accounts_org" ON ad_accounts
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER set_ad_accounts_updated_at
  BEFORE UPDATE ON ad_accounts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── REKLAM KAMPANYALARI (API cache) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ad_account_id         uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform              text NOT NULL,
  platform_campaign_id  text NOT NULL,
  name                  text,
  status                text,
  budget_daily          numeric(10,2),
  budget_total          numeric(10,2),
  spend                 numeric(10,2) DEFAULT 0,
  impressions           bigint DEFAULT 0,
  clicks                bigint DEFAULT 0,
  ctr                   numeric(5,4),
  cpc                   numeric(10,4),
  conversions           int DEFAULT 0,
  roas                  numeric(8,4),
  period_start          date,
  period_end            date,
  raw_data              jsonb DEFAULT '{}',
  fetched_at            timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),
  UNIQUE(ad_account_id, platform_campaign_id, period_start)
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_campaigns_org" ON ad_campaigns
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_ad_campaigns_org      ON ad_campaigns(organization_id);
CREATE INDEX idx_ad_campaigns_platform ON ad_campaigns(platform);
CREATE INDEX idx_ad_campaigns_fetched  ON ad_campaigns(fetched_at DESC);
