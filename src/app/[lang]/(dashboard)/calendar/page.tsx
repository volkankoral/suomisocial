import { getUpcomingSpecialDays, getSpecialDays, getSupportedCountries } from '@/lib/calendar'
import { getUserOrgCountry } from '@/lib/supabase/get-org'
import { Animate, Stagger, FadeUpItem } from '@/components/ui/animate'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function CalendarPage({ params }: Props) {
  await params

  const countryCode = await getUserOrgCountry()
  const countries   = getSupportedCountries()
  const countryName = countries.find((c) => c.code === countryCode)?.name ?? countryCode

  const today        = new Date()
  const year         = today.getFullYear()
  const upcoming     = getUpcomingSpecialDays(30, countryCode)
  const allThisYear  = getSpecialDays(year, countryCode)
  const bankHolidays = allThisYear.filter((d) => d.isBankHoliday)
  const otherDays    = allThisYear.filter((d) => !d.isBankHoliday)
  const todayStr     = today.toISOString().split('T')[0]
  const todaySpecial = upcoming.find((d) => d.date === todayStr)

  return (
    <div className="space-y-8">

      {/* Header */}
      <Animate>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Takvim</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {countryName} ({countryCode}) — resmi tatiller &amp; özel günler · {year}
            </p>
          </div>
          <a
            href="brand"
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
          >
            Ülke değiştir →
          </a>
        </div>
      </Animate>

      {/* Today banner */}
      {todaySpecial && (
        <Animate delay={0.05}>
          <div className="rounded-2xl border border-orange-500/25 bg-orange-950/20 p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-transparent pointer-events-none" />
            <p className="text-[10px] font-mono text-orange-400 mb-1.5 uppercase tracking-widest">Bugün</p>
            <p className="text-xl font-bold text-foreground mb-1">{todaySpecial.name}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {todaySpecial.isBankHoliday && (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/25 px-2.5 py-1 rounded-lg font-medium">
                  Resmi Tatil
                </span>
              )}
              <span className="text-xs bg-white/5 text-muted-foreground border border-white/10 px-2.5 py-1 rounded-lg font-mono">
                {todaySpecial.type}
              </span>
            </div>
          </div>
        </Animate>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">

        {/* Upcoming 30 days */}
        <Animate delay={0.1}>
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Önümüzdeki 30 Gün
            </h2>
            <Stagger className="space-y-2">
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground">Yaklaşan özel gün yok.</p>
              )}
              {upcoming.map((day) => {
                const d       = new Date(day.date + 'T00:00:00')
                const isToday = day.date === todayStr
                return (
                  <FadeUpItem key={day.date + day.name}>
                    <div
                      className={`flex items-start gap-4 rounded-xl border px-4 py-3 transition-all duration-200 ${
                        isToday
                          ? 'border-orange-500/30 bg-orange-950/20'
                          : day.isBankHoliday
                          ? 'border-amber-500/20 bg-amber-950/10 hover:border-amber-500/35'
                          : 'border-white/8 bg-card hover:border-white/15'
                      }`}
                    >
                      <div className="min-w-[48px] text-center shrink-0 pt-0.5">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase">
                          {d.toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-2xl font-bold text-foreground leading-none mt-0.5">
                          {d.getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {day.name}
                        </p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {day.isBankHoliday && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Resmi Tatil
                            </span>
                          )}
                          {day.type === 'observance' && (
                            <span className="text-[9px] bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Anma
                            </span>
                          )}
                          {day.type === 'optional' && (
                            <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Opsiyonel
                            </span>
                          )}
                          {day.type === 'school' && (
                            <span className="text-[9px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Okul
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </FadeUpItem>
                )
              })}
            </Stagger>
          </section>
        </Animate>

        {/* Right panel */}
        <Animate delay={0.15}>
          <div className="space-y-6">

            {/* Stats */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {year} Özeti
              </h2>
              <div className="space-y-2">
                <StatRow icon="🏛️" label="Resmi tatil"      value={bankHolidays.length} sub="İşyerleri kapalı" color="text-amber-400" />
                <StatRow icon="📅" label="Diğer özel gün" value={otherDays.length}    sub="Anma / kültürel"   color="text-blue-400" />
                <StatRow icon="🎉" label="Toplam"         value={allThisYear.length}  sub="İçerik üretilecek" color="text-emerald-400" />
              </div>
            </section>

            {/* Sonraki resmi tatil */}
            {(() => {
              const next = upcoming.find((d) => d.isBankHoliday)
              if (!next) return null
              const daysUntil = Math.ceil(
                (new Date(next.date + 'T00:00:00').getTime() - new Date(today).setHours(0, 0, 0, 0)) /
                86_400_000,
              )
              return (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Sonraki Resmi Tatil
                  </h3>
                  <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4">
                    <p className="font-semibold text-foreground">{next.name}</p>
                    <p className="text-xs mt-1 text-amber-400">
                      {new Date(next.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                      {' · '}
                      {daysUntil === 0 ? 'Bugün!' : `${daysUntil} gün sonra`}
                    </p>
                  </div>
                </section>
              )
            })()}

          </div>
        </Animate>
      </div>
    </div>
  )
}

function StatRow({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: number; sub: string; color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/14 transition-colors">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <span className={`text-2xl font-bold ${color} shrink-0`}>{value}</span>
    </div>
  )
}
