-- ════════════════════════════════════════════════════════════════════════
--  004_vault_tokens.sql
--  Sosyal medya access token'larını Supabase Vault ile şifreli saklama.
--
--  Güvenlik garantisi:
--    • Token'lar hiçbir zaman plaintext olarak DB'de durmaz
--    • pgsodium (Supabase Vault) ile şifreler; master key Supabase
--      altyapısında saklanır — bizim uygulamamız dahil kimse okuyamaz
--    • read/write sadece SECURITY DEFINER fonksiyonlar üzerinden;
--      anon / authenticated rolleri vault'a hiç dokunamaz
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Vault extension ────────────────────────────────────────────────────────
-- (Supabase projelerinde varsayılan açık gelir, yine de idempotent)
CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;

-- ── 2. social_accounts tablosuna vault referans kolonları ─────────────────────
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS access_token_vault_id  uuid,
  ADD COLUMN IF NOT EXISTS refresh_token_vault_id uuid;

-- Artık ham access_token/refresh_token NULL olabilir (vault'a taşındı)
-- Backward compat için kolonu kaldırmıyoruz, sadece NULL izni ekliyoruz
ALTER TABLE social_accounts
  ALTER COLUMN access_token  DROP NOT NULL,
  ALTER COLUMN refresh_token DROP NOT NULL;

-- ── 3. Vault wrapper fonksiyonları (sadece service_role çağırabilir) ──────────

-- 3a. Yeni secret oluştur → vault UUID döner
CREATE OR REPLACE FUNCTION create_vault_secret(
  secret_value text,
  secret_name  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT vault.create_secret(secret_value, secret_name) INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION create_vault_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION create_vault_secret(text, text) TO service_role;

-- 3b. Mevcut secret oku → plaintext döner (sadece service_role bağlamında)
CREATE OR REPLACE FUNCTION read_vault_secret(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION read_vault_secret(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION read_vault_secret(uuid) TO service_role;

-- 3c. Secret güncelle (token refresh edilince)
CREATE OR REPLACE FUNCTION update_vault_secret(
  secret_id    uuid,
  secret_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  PERFORM vault.update_secret(secret_id, secret_value);
END;
$$;

REVOKE ALL ON FUNCTION update_vault_secret(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION update_vault_secret(uuid, text) TO service_role;

-- 3d. Secret sil (hesap bağlantısı kesilince)
CREATE OR REPLACE FUNCTION delete_vault_secret(secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;

REVOKE ALL ON FUNCTION delete_vault_secret(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION delete_vault_secret(uuid) TO service_role;

-- ── 4. İndeks (vault lookup hızı) ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_social_accounts_vault_access
  ON social_accounts(access_token_vault_id)
  WHERE access_token_vault_id IS NOT NULL;
