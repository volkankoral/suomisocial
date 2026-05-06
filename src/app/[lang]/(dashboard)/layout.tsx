import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b bg-white dark:bg-zinc-900 px-6 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight">SuomiSocial</span>
          <span className="text-xs text-zinc-500 font-mono">{user.email}</span>
        </div>
      </header>
      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}
