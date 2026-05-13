import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'

async function checkAdmin() {
  const supabase = createServiceClient()
  const orgId = await getUserOrgId()
  if (!orgId) return null
  const { data } = await supabase.from('organizations').select('is_admin').eq('id', orgId).single()
  return data?.is_admin ? supabase : null
}

export async function POST(req: NextRequest) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const body = await req.json()
  const { name, slug, description, price_monthly, price_yearly, features, is_featured } = body

  if (!name || !price_monthly) return NextResponse.json({ error: 'Ad ve fiyat zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('plans')
    .insert({ name, slug, description, price_monthly, price_yearly, features, is_featured })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, plan: data })
}
