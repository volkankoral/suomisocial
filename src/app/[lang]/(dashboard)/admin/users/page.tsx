import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { UserActions } from '../_components/UserActions'

interface Props { params: Promise<{ lang: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { lang } = await params
  const supabase  = createServiceClient()
  const orgId     = await getUserOrgId()

  if (!orgId) redirect(`/${lang}/login`)
  const { data: org } = await supabase.from('organizations').select('is_admin').eq('id', orgId).single()
  if (!org?.is_admin) redirect(`/${lang}/dashboard`)

  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      id, name, created_at,
      subscriptions (
        id, status, billing_cycle, current_period_end,
        plans ( name, price_monthly )
      )
    `)
    .order('created_at', { ascending: false })

  const { data: plans } = await supabase.from('plans').select('id, name').eq('is_active', true)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Kullanıcılar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tüm organizasyonlar ve abonelik durumları</p>
      </div>

      <div className="rounded-xl border border-white/8 overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              {['Organizasyon', 'Plan', 'Durum', 'Dönem Sonu', 'Kayıt', 'İşlem'].map((h) => (
                <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-3 tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(orgs ?? []).map((o) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rawSub = (o.subscriptions as any)?.[0]
              const sub = rawSub ? {
                ...rawSub,
                plans: Array.isArray(rawSub.plans) ? rawSub.plans[0] : rawSub.plans,
              } as {
                id: string; status: string; billing_cycle: string;
                current_period_end: string | null;
                plans: { name: string; price_monthly: number } | null
              } : null
              return (
                <tr key={o.id} className="border-b border-white/6 last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sub?.plans?.name ?? <span className="text-orange-400 text-xs">Plan yok</span>}</td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        sub.status === 'active' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                        sub.status === 'trialing' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' :
                        'bg-red-500/15 text-red-400 border-red-500/20'
                      }`}>
                        {sub.status}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {sub?.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString('tr-TR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions orgId={o.id} currentPlanId={sub?.plans ? undefined : undefined} plans={plans ?? []} />
                  </td>
                </tr>
              )
            })}
            {(!orgs || orgs.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Kullanıcı bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
