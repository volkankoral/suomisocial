/**
 * Google Business Profile — OAuth token & API yardımcıları
 *
 * SADECE server-side. Google access token'ları ~1 saatte expire olur,
 * bu yüzden refresh token ile otomatik yenileme gerekir.
 *
 * API ailesi:
 *   • Account Management  — hesap listesi
 *   • Business Information — lokasyon listesi
 *   • v4 (legacy)         — localPosts (gönderi yayınlama)
 *
 * NOT: Google Business Profile API'leri kullanmadan önce Google Cloud
 * projesinde "Business Profile API" etkinleştirilmeli VE Google'dan
 * kota erişim onayı alınmalıdır (aksi halde 403 PERMISSION_DENIED).
 */

import { createServiceClient } from '@/lib/supabase/service'
import { readToken, updateToken } from '@/lib/vault'

export const GBP_ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1'
export const GBP_INFO_API    = 'https://mybusinessbusinessinformation.googleapis.com/v1'
export const GBP_V4_API      = 'https://mybusiness.googleapis.com/v4'
export const GBP_SCOPE       = 'https://www.googleapis.com/auth/business.manage'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// ── Yapılandırma ──────────────────────────────────────────────────────────────
// Google Business kendi OAuth client'ını kullanır; yoksa Google Ads'inkine düşer.

export function gbpClientId(): string {
  const id = process.env.GOOGLE_BUSINESS_CLIENT_ID ?? process.env.GOOGLE_ADS_CLIENT_ID
  if (!id) throw new Error('GOOGLE_BUSINESS_CLIENT_ID eksik')
  return id
}

export function gbpClientSecret(): string {
  const s = process.env.GOOGLE_BUSINESS_CLIENT_SECRET ?? process.env.GOOGLE_ADS_CLIENT_SECRET
  if (!s) throw new Error('GOOGLE_BUSINESS_CLIENT_SECRET eksik')
  return s
}

export function gbpConfigured(): boolean {
  return !!(process.env.GOOGLE_BUSINESS_CLIENT_ID ?? process.env.GOOGLE_ADS_CLIENT_ID)
}

// ── OAuth token işlemleri ─────────────────────────────────────────────────────

interface GoogleTokenResponse {
  access_token: string
  expires_in?: number
  refresh_token?: string
}

/** Authorization code → access + refresh token */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     gbpClientId(),
      client_secret: gbpClientSecret(),
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(data.error_description ?? 'Google token exchange başarısız')
  }
  return data
}

/** Refresh token → yeni access token */
export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     gbpClientId(),
      client_secret: gbpClientSecret(),
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(data.error_description ?? 'Google token yenileme başarısız')
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 }
}

// ── Geçerli token okuyucu ─────────────────────────────────────────────────────

interface GbpAccount {
  id: string
  access_token_vault_id?: string | null
  refresh_token_vault_id?: string | null
  access_token?: string | null
  token_expires_at?: string | null
}

/**
 * Bir google_business hesabının geçerli access token'ını döner.
 * Token süresi dolmuşsa refresh token ile yeniler, vault + DB'yi günceller.
 */
export async function getValidGoogleToken(account: GbpAccount): Promise<string | null> {
  const expiry     = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
  const stillValid = expiry > Date.now() + 5 * 60 * 1000  // 5 dk tampon

  // Token hâlâ geçerliyse vault'tan oku
  if (stillValid && account.access_token_vault_id) {
    const tok = await readToken(account.access_token_vault_id)
    if (tok) return tok
  }

  // Yenileme gerekli
  if (!account.refresh_token_vault_id) return null
  const refreshToken = await readToken(account.refresh_token_vault_id)
  if (!refreshToken) return null

  const { accessToken, expiresIn } = await refreshGoogleToken(refreshToken)

  // Vault + DB güncelle
  if (account.access_token_vault_id) {
    await updateToken(account.access_token_vault_id, accessToken)
  }
  await createServiceClient()
    .from('social_accounts')
    .update({ token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString() })
    .eq('id', account.id)

  return accessToken
}
