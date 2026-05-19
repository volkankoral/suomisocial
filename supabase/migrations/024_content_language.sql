-- İçerik dili ayarı: NULL = otomatik (bölgeye göre), 'fi'/'tr'/'en' = açık override
ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS content_language text
    CHECK (content_language IN ('fi', 'tr', 'en') OR content_language IS NULL);

COMMENT ON COLUMN brand_settings.content_language IS
  'NULL = auto (region default: fi for nordic, tr for turkey), fi/tr/en = explicit language override';
