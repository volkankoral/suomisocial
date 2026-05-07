import { getUpcomingSpecialDays, getSpecialDays } from '@/lib/calendar'
import { Animate, Stagger, FadeUpItem } from '@/components/ui/animate'

interface Props {
  params: Promise<{ lang: string }>
}

export default async function CalendarPage({ params }: Props) {
  await params

  const today        = new Date()
  const year         = today.getFullYear()
  const upcoming     = getUpcomingSpecialDays(30)
  const allThisYear  = getSpecialDays(year)
  const bankHolidays = allThisYear.filter((d) => d.holiday.isBankHoliday)
  const flagDays     = allThisYear.filter((d) => !d.holiday.isBankHoliday)
  const todayStr     = today.toISOString().split('T')[0]
  const todaySpecial = upcoming.find((d) => d.date === todayStr)

  return (
    <div className="space-y-8">

      {/* Header */}
      <Animate>
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Suomi Takvimi 🇫🇮</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Finlandiya resmi tatilleri + bayrak &amp; kültür günleri — {year}
          </p>
        </div>
      </Animate>

      {/* Today banner */}
      {todaySpecial && (
        <Animate delay={0.05}>
          <div className="rounded-2xl border border-blue-500/25 bg-blue-950/20 p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent pointer-events-none" />
            <p className="text-[10px] font-mono text-blue-400 mb-1.5 uppercase tracking-widest">Bugün</p>
            <p className="text-xl font-bold text-foreground mb-1">{todaySpecial.labelTr}</p>
            <p className="text-sm text-blue-300/80 leading-relaxed">{todaySpecial.holiday.descriptionTr}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {todaySpecial.holiday.isBankHoliday && (
                <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/25 px-2.5 py-1 rounded-lg font-medium">
                  Resmi Tatil
                </span>
              )}
              {todaySpecial.holiday.isFlagDay && (
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/15 px-2.5 py-1 rounded-lg font-medium">
                  🏳 Bayrak Günü
                </span>
              )}
            </div>
          </div>
        </Animate>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">

        {/* Upcoming 30 days — timeline */}
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
                  <FadeUpItem key={day.date}>
                    <div
                      className={`flex items-start gap-4 rounded-xl border px-4 py-3 transition-all duration-200 ${
                        isToday
                          ? 'border-blue-500/30 bg-blue-950/20'
                          : day.holiday.isBankHoliday
                          ? 'border-amber-500/20 bg-amber-950/10 hover:border-amber-500/35'
                          : 'border-white/8 bg-card hover:border-white/15'
                      }`}
                    >
                      <div className="min-w-[48px] text-center shrink-0 pt-0.5">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase">
                          {d.toLocaleDateString('fi-FI', { month: 'short' })}
                        </p>
                        <p className="text-2xl font-bold text-foreground leading-none mt-0.5">
                          {d.getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {day.labelTr}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                          {day.holiday.descriptionTr}
                        </p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {day.holiday.isBankHoliday && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Resmi Tatil
                            </span>
                          )}
                          {day.holiday.category === 'observed' && (
                            <span className="text-[9px] bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              Tanınan Gün
                            </span>
                          )}
                          {day.holiday.category === 'flagday' && (
                            <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-medium">
                              🏳 Bayrak Günü
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
                <StatRow icon="🏛️" label="Resmi tatil"        value={bankHolidays.length} sub="İşyerleri kapalı" color="text-amber-400" />
                <StatRow icon="🇫🇮" label="Bayrak &amp; kültür günü" value={flagDays.length}     sub="Ulusal bayrak çekilir" color="text-blue-400" />
                <StatRow icon="🎉" label="Toplam özel gün"   value={allThisYear.length}  sub="İçerik üretilecek" color="text-emerald-400" />
              </div>
            </section>

            {/* Sonraki resmi tatil */}
            <NextDayCard
              title="Sonraki Resmi Tatil"
              day={upcoming.find((d) => d.holiday.isBankHoliday)}
              today={today}
              colorClass="border-amber-500/25 bg-amber-950/15"
              textClass="text-amber-400"
              accentClass="text-amber-300"
            />

            {/* Sonraki bayrak günü */}
            <NextDayCard
              title="Sonraki Bayrak Günü"
              day={upcoming.find((d) => d.holiday.category === 'flagday')}
              today={today}
              colorClass="border-blue-500/25 bg-blue-950/15"
              textClass="text-blue-400"
              accentClass="text-blue-300"
            />

          </div>
        </Animate>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function StatRow({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: number; sub: string; color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-card px-4 py-3 hover:border-white/14 transition-colors">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground" dangerouslySetInnerHTML={{ __html: label }} />
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <span className={`text-2xl font-bold ${color} shrink-0`}>{value}</span>
    </div>
  )
}

function NextDayCard({
  title, day, today, colorClass, textClass, accentClass,
}: {
  title: string
  day: ReturnType<typeof getUpcomingSpecialDays>[0] | undefined
  today: Date
  colorClass: string
  textClass: string
  accentClass: string
}) {
  if (!day) return null
  const daysUntil = Math.ceil(
    (new Date(day.date + 'T00:00:00').getTime() - new Date(today).setHours(0, 0, 0, 0)) /
    86_400_000,
  )
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
      <div className={`rounded-xl border p-4 ${colorClass}`}>
        <p className="font-semibold text-foreground">{day.labelTr}</p>
        <p className={`text-xs mt-1 ${textClass}`}>
          {new Date(day.date + 'T00:00:00').toLocaleDateString('fi-FI', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
          {' · '}
          {daysUntil === 0 ? 'Bugün!' : `${daysUntil} gün sonra`}
        </p>
        <p className={`text-xs mt-1.5 leading-snug ${accentClass}/70`}>
          {day.holiday.descriptionTr}
        </p>
      </div>
    </section>
  )
}
