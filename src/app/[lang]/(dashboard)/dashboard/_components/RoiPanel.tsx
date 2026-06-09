'use client'

import { useT } from '@/lib/useT'
import type { RoiSummary } from '@/lib/roi'

export function RoiPanel({ roi }: { roi: RoiSummary }) {
  const t = useT()
  const r = t.roi

  const isEmpty = roi.contentCreated === 0
  const nf = (n: number) => n.toLocaleString()

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-orange-950/25 via-card to-pink-950/15 p-5 sm:p-6">
      <h2 className="text-xs font-semibold text-orange-300/80 uppercase tracking-widest mb-3">
        {r.title}
      </h2>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{r.empty}</p>
      ) : (
        <>
          {/* Değer hikayesi */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-5">
            <div>
              <p className="text-xs text-muted-foreground">{r.vsAgency}</p>
              <p className="text-2xl sm:text-3xl font-bold gradient-text leading-tight">
                {roi.currency}{nf(roi.agencyValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">⏱</p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                {roi.hoursSaved} <span className="text-base font-medium text-muted-foreground">{r.hoursSaved}</span>
              </p>
            </div>
          </div>

          {/* İstatistik kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { icon: '✨', label: r.contentCreated,  value: nf(roi.contentCreated) },
              { icon: '📤', label: r.published,       value: nf(roi.published) },
              { icon: '👁',  label: r.totalReach,      value: roi.totalReach > 0 ? nf(roi.totalReach) : '—' },
              { icon: '❤️', label: r.totalEngagement, value: roi.totalEngagement > 0 ? nf(roi.totalEngagement) : '—' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-card/60 px-3 py-2.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{s.icon}</span> {s.label}
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
