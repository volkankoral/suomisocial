import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Props { params: Promise<{ lang: string }> }

export default async function AdminPage({ params }: Props) {
  const { lang } = await params
  const supabase  = createServiceClient()
  const orgId     = await getUserOrgId()

  if (!orgId) redirect(`/${lang}/login`)

  // Admin kontrolü
  const { data: org } = await supabase
    .from('organizations')
    .select('is_admin')
    .eq('id', orgId)
    .single()

  if (!org?.is_admin) redirect(`/${lang}/dashboard`)

  // İstatistikler
  const [
    { count: totalUsers },
    { count: totalSubs },
    { count: activeSubs },
    { data: recentSubs },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subscriptions')
      .select('id, status, created_at, organizations(name), plans(name, price_monthly)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { icon: '🏢', label: 'Toplam Organizasyon', value: totalUsers ?? 0, color: 'text-blue-400' },
    { icon: '💳', label: 'Toplam Abonelik', value: totalSubs ?? 0, color: 'text-purple-400' },
    { icon: '✅', label: 'Aktif Abonelik', value: activeSubs ?? 0, color: 'text-green-400' },
  ]

  const menuItems = [
    { href: `/${lang}/admin/plans`,   icon: '📦', label: 'Plan Yönetimi',   desc: 'Plan oluştur, fiyat belirle' },
    { href: `/${lang}/admin/users`,   icon: '👥', label: 'Kullanıcılar',    desc: 'Abonelik ve plan yönetimi' },
    { href: `/${lang}/admin/coupons`, icon: '🎟️', label: 'Kupon Yönetimi',  desc: 'İndirim kuponu oluştur' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Admin Paneli</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sistem yönetimi ve kullanıcı kontrolü</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-card px-5 py-4 flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Menü */}
      <div className="grid gap-4 sm:grid-cols-3">
        {menuItems.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-white/8 bg-card p-5 hover:border-white/20 hover:bg-white/4 transition-all group"
          >
            <span className="text-3xl block mb-3">{m.icon}</span>
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
          </Link>
        ))}
      </div>

      {/* Son Abonelikler */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Son Abonelikler</h2>
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                {['Organizasyon', 'Plan', 'Ücret', 'Durum', 'Tarih'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground uppercase px-4 py-2.5 tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentSubs ?? []).map((s: {
                id: string
                status: string
                created_at: string
                organizations: { name: string }[] | { name: string } | null
                plans: { name: string; price_monthly: number }[] | { name: string; price_monthly: number } | null
              }) => {
                const org  = Array.isArray(s.organizations) ? s.organizations[0] : s.organizations
                const plan = Array.isArray(s.plans) ? s.plans[0] : s.plans
                return (
                <tr key={s.id} className="border-b border-white/6 last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{org?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{plan?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground">€{plan?.price_monthly?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      s.status === 'active' ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-white/8 text-muted-foreground border-white/10'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(s.created_at).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
                )
              })}
              {(!recentSubs || recentSubs.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Henüz abonelik yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
