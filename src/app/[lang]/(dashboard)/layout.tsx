import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserOrgId } from '@/lib/supabase/get-org'
import { NavBar } from './_components/NavBar'

interface Props {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}

export default async function DashboardLayout({ children, params }: Props) {
  const { lang } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${lang}/login`)

  // Admin kontrolü
  const orgId = await getUserOrgId()
  let isAdmin = false
  if (orgId) {
    const serviceClient = createServiceClient()
    const { data: org } = await serviceClient.from('organizations').select('is_admin').eq('id', orgId).single()
    isAdmin = !!org?.is_admin
  }

  const navLinks = [
    { href: `/${lang}/dashboard`, label: 'Dashboard', icon: '⬡' },
    { href: `/${lang}/calendar`,  label: 'Takvim',    icon: '🇫🇮' },
    { href: `/${lang}/content`,   label: 'İçerik',    icon: '✨' },
    { href: `/${lang}/posts`,     label: 'Yayınlar',  icon: '📤' },
    { href: `/${lang}/social`,    label: 'Hesaplar',  icon: '🔗' },
    { href: `/${lang}/ads`,       label: 'Reklamlar', icon: '📊' },
    { href: `/${lang}/brand`,     label: 'Marka',     icon: '⚙️' },
    { href: `/${lang}/billing`,   label: 'Abonelik',  icon: '💳' },
    ...(isAdmin ? [{ href: `/${lang}/admin`, label: 'Admin', icon: '🛡️' }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar links={navLinks} email={user.email ?? ''} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-8">
        {children}
      </main>
    </div>
  )
}
