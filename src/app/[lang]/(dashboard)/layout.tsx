import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const navLinks = [
    { href: `/${lang}/dashboard`, label: 'Dashboard', icon: '⬡' },
    { href: `/${lang}/calendar`,  label: 'Takvim',    icon: '🇫🇮' },
    { href: `/${lang}/content`,   label: 'İçerik',    icon: '✨' },
    { href: `/${lang}/posts`,     label: 'Yayınlar',  icon: '📤' },
    { href: `/${lang}/social`,    label: 'Hesaplar',  icon: '🔗' },
    { href: `/${lang}/ads`,       label: 'Reklamlar', icon: '📊' },
    { href: `/${lang}/brand`,     label: 'Marka',     icon: '⚙️' },
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
