import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function POST(req: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const orgId = await getUserOrgId()
  if (!orgId) return NextResponse.json({ error: 'Org bulunamadı' }, { status: 400 })

  const { businessName, businessType, tone } = await req.json()

  const supabase = createServiceClient()

  // Org adını da güncelle
  await supabase.from('organizations').update({ name: businessName }).eq('id', orgId)

  // Brand settings upsert
  const { error } = await supabase
    .from('brand_settings')
    .upsert({
      organization_id: orgId,
      business_name: businessName,
      business_type: businessType || null,
      tone: tone || 'friendly',
    }, { onConflict: 'organization_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
