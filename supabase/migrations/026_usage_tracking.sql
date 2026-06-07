-- ============================================================
-- Kullanım Takibi — Aylık AI içerik sayacı
-- ============================================================

-- Org başına aylık bir satır (upsert ile güncellenir)
CREATE TABLE IF NOT EXISTS usage_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start        date NOT NULL,                  -- Ayın ilk günü (2025-06-01)
  content_generated   integer NOT NULL DEFAULT 0,     -- O ay üretilen AI içerik sayısı
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  UNIQUE (organization_id, period_start)
);

-- Hızlı arama için indeks
CREATE INDEX idx_usage_org_period ON usage_records(organization_id, period_start);

-- Updated_at otomatik güncelleme
CREATE TRIGGER set_usage_records_updated_at
  BEFORE UPDATE ON usage_records
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi org'unun verisini görebilir
CREATE POLICY "usage_records_org_read" ON usage_records
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Sadece service role yazabilir (API route'lar service client kullanır)
CREATE POLICY "usage_records_service_all" ON usage_records
  FOR ALL USING (auth.role() = 'service_role');

-- Admin her şeyi görebilir
CREATE POLICY "usage_records_admin_read" ON usage_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = auth.uid() AND o.is_admin = true
    )
  );

-- ============================================================
-- Atomic sayaç artırma fonksiyonu (race condition önler)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_usage(
  p_org_id      uuid,
  p_period_start date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO usage_records (organization_id, period_start, content_generated)
  VALUES (p_org_id, p_period_start, 1)
  ON CONFLICT (organization_id, period_start)
  DO UPDATE SET
    content_generated = usage_records.content_generated + 1,
    updated_at = now();
END;
$$;
