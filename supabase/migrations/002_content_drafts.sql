-- content_drafts: AI tarafından üretilmiş, kullanıcı onayı bekleyen post taslakları

CREATE TABLE IF NOT EXISTS content_drafts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Hangi özel gün için üretildi
  special_day_date          date NOT NULL,
  special_day_label         text NOT NULL,  -- Fince ad
  special_day_label_tr      text NOT NULL,  -- Türkçe ad
  special_day_description_tr text,          -- AI bağlamı

  -- AI tarafından üretilen içerik
  caption_fi                text,           -- Fince caption
  caption_tr                text,           -- Türkçe caption (sahip için referans)
  hashtags                  text[] DEFAULT '{}',
  image_url                 text,           -- Pollinations / Replicate URL
  image_prompt              text,           -- Görsel üretiminde kullanılan prompt

  -- Durum
  status                    text NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'posted')),
  platforms                 text[] DEFAULT '{}',  -- instagram, facebook, tiktok

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_drafts_org_policy" ON content_drafts
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

-- updated_at trigger
CREATE TRIGGER set_content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- İndeksler
CREATE INDEX idx_content_drafts_org    ON content_drafts(organization_id);
CREATE INDEX idx_content_drafts_date   ON content_drafts(special_day_date);
CREATE INDEX idx_content_drafts_status ON content_drafts(status);
