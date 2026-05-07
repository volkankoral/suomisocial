/**
 * Giriş yapmış kullanıcının organizasyon bilgilerini döndürür.
 */

import { createClient } from './server'

export interface UserOrg {
  organization_id: string
  role: string
  organizations: {
    id: string
    name: string
    slug: string
  }
}

export async function getUserOrg(): Promise<UserOrg | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  return data as UserOrg | null
}

export async function getUserOrgId(): Promise<string | null> {
  const org = await getUserOrg()
  return org?.organization_id ?? null
}
