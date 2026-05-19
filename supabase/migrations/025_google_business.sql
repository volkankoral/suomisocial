-- ════════════════════════════════════════════════════════════════════════
--  025_google_business.sql
--  Google Business Profile (Google Haritalar / Arama) entegrasyonu.
--
--  social_accounts.platform ve posts.platform CHECK kısıtlarına
--  'google_business' değeri eklenir. Token saklama mevcut vault
--  altyapısını (004_vault_tokens.sql) kullanır — yeni kolon gerekmez.
-- ════════════════════════════════════════════════════════════════════════

-- ── social_accounts ──────────────────────────────────────────────────────────
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'google_business'));

-- ── posts ────────────────────────────────────────────────────────────────────
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_platform_check;
ALTER TABLE posts ADD CONSTRAINT posts_platform_check
  CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'google_business'));
