-- ============================================================
-- Autopilot Settings — haftalık otomatik taslak üretimi
-- Pro & Business plan kullanıcıları için
-- ============================================================

-- Autopilot ayarları (organizasyon başına bir satır)
CREATE TABLE IF NOT EXISTS autopilot_settings (
  organization_id  uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled          boolean     DEFAULT false,
  -- 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi (UTC günü)
  day_of_week      integer     DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  -- Her çalışmada kaç taslak üretilsin
  drafts_per_run   integer     DEFAULT 4 CHECK (drafts_per_run BETWEEN 1 AND 7),
  -- Son çalışma zamanı (istatistik için)
  last_run_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- content_drafts'a autopilot flag ekle
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS is_autopilot boolean DEFAULT false;

-- RLS
ALTER TABLE autopilot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autopilot_org_member_access" ON autopilot_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Service role her şeyi yapabilsin (cron job için)
CREATE POLICY "autopilot_service_all" ON autopilot_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_autopilot_settings_updated_at
  BEFORE UPDATE ON autopilot_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Günlük cron sorgusunu hızlandır
CREATE INDEX IF NOT EXISTS idx_autopilot_enabled_dow
  ON autopilot_settings(day_of_week) WHERE enabled = true;

-- is_autopilot üzerinden taslak filtresi
CREATE INDEX IF NOT EXISTS idx_drafts_autopilot
  ON content_drafts(organization_id, is_autopilot, status)
  WHERE is_autopilot = true;
