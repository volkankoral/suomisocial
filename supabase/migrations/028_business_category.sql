-- ============================================================
-- İşletme Kategorisi — AI görsel/içerik prompt'unu yönlendirir
-- ============================================================
-- Sistem restoranlar için tasarlandı ama mimari yatay.
-- business_category, AI prompt'unu sektöre uygun hale getirir
-- (yemek fotoğrafı vs. salon vs. perakende vs. fitness...).

ALTER TABLE brand_settings
  ADD COLUMN IF NOT EXISTS business_category text DEFAULT 'restaurant';

COMMENT ON COLUMN brand_settings.business_category IS
  'AI görsel stratejisini yönlendiren sektör: restaurant, beauty, retail, fitness, services, other';
