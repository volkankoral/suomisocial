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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { error } = await supabase.from('plans').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { id } = await params
  const { error } = await supabase.from('plans').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
