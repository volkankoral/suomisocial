import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const phases = [
    { label: 'Faz 0', desc: 'Foundation — tamamlandı', done: true },
    { label: 'Faz 1', desc: 'Finnish takvim (resmi tatiller + Nimipäivä)', done: false },
    { label: 'Faz 2', desc: 'AI içerik üretimi (görsel + video + metin)', done: false },
    { label: 'Faz 3', desc: 'Instagram + Facebook paylaşımı', done: false },
    { label: 'Faz 4', desc: 'TikTok entegrasyonu', done: false },
    { label: 'Faz 5', desc: 'Reklam monitoring dashboard', done: false },
    { label: 'Faz 6', desc: 'AI reklam optimizasyonu', done: false },
    { label: 'Faz 7', desc: 'SaaS dönüşümü', done: false },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Hoş geldin, {user?.email} · SuomiSocial v0.1.0
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map((phase) => (
          <div
            key={phase.label}
            className={`rounded-xl border p-4 ${
              phase.done
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
            }`}
          >
            <p className="text-xs font-mono text-zinc-400 mb-1">{phase.label}</p>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
              {phase.desc}
            </p>
            {phase.done && (
              <span className="mt-2 inline-block text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Hazır
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
