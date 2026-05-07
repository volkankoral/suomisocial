/**
 * Supabase Vault — şifreli token yönetimi
 *
 * Güvenlik modeli:
 *   • SADECE server-side çalışır (service_role key gerektirir)
 *   • Token'lar pgsodium ile şifrelenir; master key Supabase tarafında
 *   • Wrapper SQL fonksiyonları anon/authenticated rollerine REVOKE edilmiş
 *   • Bu modül hiçbir zaman client bundle'a dahil edilmemelidir
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Admin client (service_role) ───────────────────────────────────────────────

let _admin: SupabaseClient | null = null

function adminClient(): SupabaseClient {
  if (_admin) return _admin
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) throw new Error('Vault: SUPABASE_SERVICE_ROLE_KEY eksik')
  _admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _admin
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Token'ı vault'a şifreli kaydet → UUID döner
 * name: hata ayıklama için etiket (token içeriği değil)
 */
export async function storeToken(value: string, name?: string): Promise<string> {
  const { data, error } = await adminClient().rpc('create_vault_secret', {
    secret_value: value,
    secret_name:  name ?? null,
  })
  if (error) throw new Error(`Vault storeToken hatası: ${error.message}`)
  return data as string
}

/**
 * Mevcut vault ID varsa güncelle, yoksa yeni oluştur → UUID döner
 */
export async function upsertToken(
  value: string,
  existingVaultId: string | null | undefined,
  name?: string,
): Promise<string> {
  if (existingVaultId) {
    await updateToken(existingVaultId, value)
    return existingVaultId
  }
  return storeToken(value, name)
}

/**
 * Vault UUID'sinden token'ı çöz → string | null
 * Null: secret bulunamadı veya silinmiş
 */
export async function readToken(vaultId: string): Promise<string | null> {
  const { data, error } = await adminClient().rpc('read_vault_secret', {
    secret_id: vaultId,
  })
  if (error) {
    console.error('Vault readToken hatası:', error.message)
    return null
  }
  return (data as string) ?? null
}

/**
 * Token'ı vault'ta güncelle (refresh token senaryosu)
 */
export async function updateToken(vaultId: string, newValue: string): Promise<void> {
  const { error } = await adminClient().rpc('update_vault_secret', {
    secret_id:    vaultId,
    secret_value: newValue,
  })
  if (error) throw new Error(`Vault updateToken hatası: ${error.message}`)
}

/**
 * Token'ı vault'tan kalıcı sil (hesap bağlantısı kesilince)
 */
export async function deleteToken(vaultId: string): Promise<void> {
  const { error } = await adminClient().rpc('delete_vault_secret', {
    secret_id: vaultId,
  })
  if (error) console.error('Vault deleteToken hatası:', error.message)
}

// ── Sosyal hesap token okuyucu ────────────────────────────────────────────────

/**
 * Bir social_accounts kaydının access token'ını döner.
 * Önce vault'ta arar, yoksa legacy plaintext kolonuna düşer.
 */
export async function getSocialToken(account: {
  access_token_vault_id?: string | null
  access_token?: string | null
}): Promise<string | null> {
  if (account.access_token_vault_id) {
    return readToken(account.access_token_vault_id)
  }
  // Legacy fallback (vault'a taşınmamış eski kayıtlar)
  return account.access_token ?? null
}
