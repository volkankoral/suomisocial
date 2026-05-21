import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { deleteToken } from '@/lib/vault'

// DELETE /api/social/:id  — hesap bağlantısını kes + vault'taki token'ı sil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Auth kontrolü (user client ile)
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const orgId = await getUserOrgId()
  if (!orgId) {
    return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })
  }

  // Service client ile RLS bypass (delete işlemi için)
  const admin = createServiceClient()

  // Önce vault ID'lerini al + org doğrula
  const { data: account, error: fetchErr } = await admin
    .from('social_accounts')
    .select('id, access_token_vault_id, refresh_token_vault_id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (fetchErr || !account) {
    return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })
  }

  // DB kaydını önce sil (hızlı yol — kullanıcıyı bekletme)
  const { error } = await admin
    .from('social_accounts')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    console.error('[disconnect] delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Vault token'larını arka planda temizle (non-blocking — kullanıcıyı yavaşlatmasın)
  const vaultCleanup = async () => {
    if (account?.access_token_vault_id) {
      await deleteToken(account.access_token_vault_id).catch(() => {})
    }
    if (account?.refresh_token_vault_id) {
      await deleteToken(account.refresh_token_vault_id).catch(() => {})
    }
  }
  // Fire-and-forget
  vaultCleanup()

  return NextResponse.json({ ok: true })
}
