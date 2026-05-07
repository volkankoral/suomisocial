import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { deleteToken } from '@/lib/vault'

// DELETE /api/social/:id  — hesap bağlantısını kes + vault'taki token'ı sil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id }   = await params
  const supabase = await createClient()
  const orgId    = await getUserOrgId()

  if (!orgId) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  // Önce vault ID'lerini al
  const { data: account } = await supabase
    .from('social_accounts')
    .select('access_token_vault_id, refresh_token_vault_id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  // Vault'taki şifreli token'ları temizle
  if (account?.access_token_vault_id) {
    await deleteToken(account.access_token_vault_id)
  }
  if (account?.refresh_token_vault_id) {
    await deleteToken(account.refresh_token_vault_id)
  }

  // DB kaydını sil
  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
