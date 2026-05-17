import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  let orgId = await getUserOrgId()

  // Org üyeliği yoksa otomatik oluştur (callback başarısız olduysa fallback)
  if (!orgId) {
    const businessNameMeta: string =
      user.user_metadata?.business_name ?? user.email?.split('@')[0] ?? 'My Business'

    const slug =
      businessNameMeta
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) +
      '-' +
      Math.random().toString(36).slice(2, 6)

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: businessNameMeta, slug, country_code: 'FI' })
      .select()
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organizasyon oluşturulamadı: ' + orgError?.message }, { status: 500 })
    }

    await supabase.from('organization_members').insert({
      user_id: user.id,
      organization_id: org.id,
      role: 'owner',
    })

    orgId = org.id
  }

  const body = await request.json()

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
