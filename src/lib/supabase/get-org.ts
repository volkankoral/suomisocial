/**
 * Giriş yapmış kullanıcının organizasyon bilgilerini döndürür.
 * Service role key kullanarak RLS bypass eder (user auth zaten doğrulanmış).
 */

import { createClient } from './server'
import { createServiceClient } from './service'

export interface UserOrg {
  organization_id: string
  role: string
  organizations: {
    id: string
    name: string
    slug: string
    country_code?: string
  }
}

export async function getUserOrg(): Promise<UserOrg | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, slug, country_code)')
    .eq('user_id', user.id)
    .single()

  return data as UserOrg | null
}

export async function getUserOrgId(): Promise<string | null> {
  const org = await getUserOrg()
  return org?.organization_id ?? null
}

export async function getUserOrgCountry(): Promise<string> {
  const org = await getUserOrg()
  return org?.organizations?.country_code ?? 'FI'
}
