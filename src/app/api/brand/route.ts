import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Organizasyon bulunamadı' }, { status: 403 })

  const body = await request.json()
  const supabase = createServiceClient()

  // country_code'u organizations tablosuna yaz, gerisini brand_settings'e
  const { country_code, ...brandFields } = body as {
    country_code?: string
    [k: string]: unknown
  }

  if (country_code && /^[A-Za-z]{2}$/.test(country_code)) {
    await supabase
      .from('organizations')
      .update({ country_code: country_code.toUpperCase() })
      .eq('id', orgId)
  }

  const { error } = await supabase.from('brand_settings').upsert(
    { ...brandFields, organization_id: orgId },
    { onConflict: 'organization_id' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
