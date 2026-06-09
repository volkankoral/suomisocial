import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { NavBar } from './_components/NavBar'
import { translations, type Lang } from '@/lib/translations'

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export default async function DashboardLayout({ children, params }: Props) {
  const { lang: rawLang } = await params
  const lang = (rawLang as Lang) in translations ? (rawLang as Lang) : 'tr'
  const t = translations[lang]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${lang}/login`)

  const orgId = await getUserOrgId()
  let isAdmin = false
  let hasActiveSubscription = false

  if (orgId) {
    const serviceClient = createServiceClient()

    const [{ data: org }, { data: sub }] = await Promise.all([
      serviceClient.from('organizations').select('is_admin').eq('id', orgId).single(),
      serviceClient
        .from('subscriptions')
        .select('id, status')
        .eq('organization_id', orgId)
        .in('status', ['active', 'trialing'])
        .limit(1)
        .maybeSingle(),
    ])

    isAdmin = !!org?.is_admin
    hasActiveSubscription = isAdmin || !!sub
  }

  const navLinks = [
    { href: `/${lang}/dashboard`, label: t.nav.dashboard, icon: '⬡' },
    { href: `/${lang}/calendar`,  label: t.nav.calendar,  icon: '🇫🇮' },
    { href: `/${lang}/content`,   label: t.nav.content,   icon: '✨' },
    { href: `/${lang}/posts`,     label: t.nav.posts,     icon: '📤' },
    { href: `/${lang}/social`,    label: t.nav.social,    icon: '🔗' },
    { href: `/${lang}/ads`,       label: t.nav.ads,       icon: '📊' },
    { href: `/${lang}/brand`,      label: t.nav.brand,      icon: '⚙️' },
    { href: `/${lang}/billing`,   label: t.nav.billing,   icon: '💳' },
    { href: `/${lang}/autopilot`, label: t.nav.autopilot, icon: '⚡' },
    { href: `/${lang}/agent`,     label: t.nav.agent,     icon: '🤖' },
    ...(isAdmin ? [{ href: `/${lang}/admin`, label: t.nav.admin, icon: '🛡️' }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar links={navLinks} email={user.email ?? ''} lang={lang} />
      {!hasActiveSubscription && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center">
          <p className="text-xs text-amber-300">
            ⚠️ Aktif aboneliğiniz yok —{' '}
            <a href={`/${lang}/billing`} className="underline hover:text-amber-100 font-medium">
              plan seçin
            </a>{' '}
            ve AI içerik üretimine başlayın.
          </p>
        </div>
      )}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-5 py-5 sm:py-8">
        {children}
      </main>
    </div>
  )
}
