import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { PlanForm } from '../_components/PlanForm'
import { PlanCard } from '../_components/PlanCard'

interface Props { params: Promise<{ lang: string }> }

export default async function AdminPlansPage({ params }: Props) {
  const { lang } = await params
  const supabase  = createServiceClient()
  const orgId     = await getUserOrgId()

  if (!orgId) redirect(`/${lang}/login`)

  const { data: org } = await supabase.from('organizations').select('is_admin').eq('id', orgId).single()
  if (!org?.is_admin) redirect(`/${lang}/dashboard`)

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Plan Yönetimi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Abonelik planlarını oluştur ve fiyatları belirle</p>
      </div>

      {/* Mevcut planlar */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Mevcut Planlar <span className="normal-case text-primary ml-1 font-mono">{plans?.length ?? 0}</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      {/* Yeni plan formu */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Yeni Plan Oluştur</h2>
        <PlanForm />
      </section>
    </div>
  )
}
