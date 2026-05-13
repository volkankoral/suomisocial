import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import { CouponForm } from '../_components/CouponForm'

interface Props { params: Promise<{ lang: string }> }

export default async function AdminCouponsPage({ params }: Props) {
  const { lang } = await params
  const supabase  = createServiceClient()
  const orgId     = await getUserOrgId()

  if (!orgId) redirect(`/${lang}/login`)
  const { data: org } = await supabase.from('organizations').select('is_admin').eq('id', orgId).single()
  if (!org?.is_admin) redirect(`/${lang}/dashboard`)

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*, plans(name)')
    .order('created_at', { ascending: false })

  const { data: plans } = await supabase.from('plans').select('id, name').eq('is_active', true)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Kupon Yönetimi</h1>
        <p className="mt-1 text-sm text-muted-foreground">İndirim kuponu oluştur ve kullanıcılara özel indirim yap</p>
      </div>

      {/* Mevcut kuponlar */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Kuponlar <span className="normal-case text-primary ml-1 font-mono">{coupons?.length ?? 0}</span>
        </h2>
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                {['Kod', 'İndirim', 'Plan', 'Email', 'Kullanım', 'Geçerlilik', 'Durum'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5 tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(coupons ?? []).map((c: {
                id: string
                code: string
                discount_type: string
                discount_value: number
                applies_to_email: string | null
                used_count: number
                max_uses: number | null
                expires_at: string | null
                is_active: boolean
                plans: { name: string } | null
              }) => (
                <tr key={c.id} className="border-b border-white/6 last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-white/8 border border-white/12 px-2 py-0.5 rounded font-mono text-primary">
                      {c.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium text-green-400">
                    {c.discount_type === 'percent' ? `%${c.discount_value}` : `€${c.discount_value}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.plans?.name ?? 'Tüm planlar'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.applies_to_email ?? 'Herkes'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.used_count}/{c.max_uses ?? '∞'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      c.is_active ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-white/8 text-muted-foreground border-white/10'
                    }`}>
                      {c.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!coupons || coupons.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Henüz kupon yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Yeni kupon */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Yeni Kupon Oluştur</h2>
        <CouponForm plans={plans ?? []} />
      </section>
    </div>
  )
}
