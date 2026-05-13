import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
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

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const body = await req.json()
  const { code, description, discount_type, discount_value, applies_to_plan, applies_to_email, max_uses, expires_at } = body

  if (!code || !discount_value) return NextResponse.json({ error: 'Kod ve indirim zorunlu' }, { status: 400 })

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: code.toUpperCase(),
      description,
      discount_type,
      discount_value,
      applies_to_plan: applies_to_plan || null,
      applies_to_email: applies_to_email || null,
      max_uses: max_uses || null,
      expires_at: expires_at || null,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, coupon: data })
}

export async function GET() {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { data, error } = await supabase
    .from('coupons')
    .select('*, plans(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
