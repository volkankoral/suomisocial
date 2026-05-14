-- content_drafts'a kategori ekle (haftalık rutin / özel gün / kampanya)
-- ve zamanlama desteği

ALTER TABLE content_drafts
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'special_day'
    CHECK (category IN ('weekly_routine', 'special_day', 'campaign')),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_results jsonb DEFAULT '{}'::jsonb,  -- {instagram: {id, error?}, facebook: {...}}
  ADD COLUMN IF NOT EXISTS campaign_brief text,                     -- Kampanya postu için kullanıcı açıklaması
  ADD COLUMN IF NOT EXISTS special_day_id text;                     -- fi-special-days.ts içindeki id

-- 'posted' yerine daha detaylı durumlar
ALTER TABLE content_drafts DROP CONSTRAINT IF EXISTS content_drafts_status_check;
ALTER TABLE content_drafts ADD CONSTRAINT content_drafts_status_check
  CHECK (status IN ('pending', 'approved', 'scheduled', 'posting', 'posted', 'rejected', 'failed'));

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_content_drafts_category     ON content_drafts(category);
CREATE INDEX IF NOT EXISTS idx_content_drafts_scheduled_at ON content_drafts(scheduled_at)
  WHERE status = 'scheduled';

-- Cron job tarafından kullanılan view: yayınlanmayı bekleyen postlar
CREATE OR REPLACE VIEW pending_scheduled_posts AS
  SELECT *
  FROM content_drafts
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= now()
  ORDER BY scheduled_at ASC;
