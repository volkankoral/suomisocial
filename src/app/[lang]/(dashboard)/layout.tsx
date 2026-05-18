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
  if (orgId) {
    const serviceClient = createServiceClient()
    const { data: org } = await serviceClient.from('organizations').select('is_admin').eq('id', orgId).single()
    isAdmin = !!org?.is_admin
  }

  const navLinks = [
    { href: `/${lang}/dashboard`, label: t.nav.dashboard, icon: '⬡' },
    { href: `/${lang}/calendar`,  label: t.nav.calendar,  icon: '🇫🇮' },
    { href: `/${lang}/content`,   label: t.nav.content,   icon: '✨' },
    { href: `/${lang}/posts`,     label: t.nav.posts,     icon: '📤' },
    { href: `/${lang}/social`,    label: t.nav.social,    icon: '🔗' },
    { href: `/${lang}/ads`,       label: t.nav.ads,       icon: '📊' },
    { href: `/${lang}/brand`,     label: t.nav.brand,     icon: '⚙️' },
    { href: `/${lang}/billing`,   label: t.nav.billing,   icon: '💳' },
    ...(isAdmin ? [{ href: `/${lang}/admin`, label: t.nav.admin, icon: '🛡️' }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar links={navLinks} email={user.email ?? ''} lang={lang} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-5 py-5 sm:py-8">
        {children}
      </main>
    </div>
  )
}
