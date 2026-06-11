'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/useT'

interface ReputationSettings {
  organization_id?: string
  notify_email?: string | null
  widget_enabled?: boolean | null
  widget_min_rating?: number | null
  widget_max_count?: number | null
  widget_theme?: string | null
}

interface Props {
  lang: string
  initialSettings: ReputationSettings | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ReputationSettingsPage({ lang, initialSettings }: Props) {
  const t = useT()

  const [notifyEmail,   setNotifyEmail]   = useState(initialSettings?.notify_email   ?? '')
  const [widgetEnabled, setWidgetEnabled] = useState(initialSettings?.widget_enabled ?? true)
  const [minRating,     setMinRating]     = useState(initialSettings?.widget_min_rating ?? 4)
  const [maxCount,      setMaxCount]      = useState(initialSettings?.widget_max_count  ?? 10)
  const [theme,         setTheme]         = useState<'dark' | 'light'>(
    (initialSettings?.widget_theme as 'dark' | 'light') ?? 'dark',
  )
  const [saveState, setSaveState] = useState<SaveState>('idle')

  async function handleSave() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/reviews/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_email:      notifyEmail.trim() || null,
          widget_enabled:    widgetEnabled,
          widget_min_rating: minRating,
          widget_max_count:  maxCount,
          widget_theme:      theme,
        }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
      if (res.ok) setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
    }
  }

  const saveBtnLabel =
    saveState === 'saving' ? t.reviews.savingSettings :
    saveState === 'saved'  ? t.reviews.savedSettings  :
    saveState === 'error'  ? t.reviews.saveError      :
    t.reviews.saveSettings

  const saveBtnStyle =
    saveState === 'saved'  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    saveState === 'error'  ? 'bg-red-500/20 text-red-400 border-red-500/30'             :
    'bg-primary/15 text-primary border-primary/25 hover:bg-primary/25'

  return (
    <div className="max-w-2xl space-y-8">

      {/* Back link + header */}
      <div>
        <Link
          href={`/${lang}/reviews`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          {t.reviews.backToReviews}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{t.reviews.settingsTitle}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.reviews.settingsSubtitle}</p>
      </div>

      {/* ── Notification settings ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>🔔</span> {t.reviews.notifySection}
          </h2>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t.reviews.notifyEmailLabel}
            </label>
            <p className="text-xs text-muted-foreground">{t.reviews.notifyEmailDesc}</p>
            <input
              type="email"
              value={notifyEmail}
              onChange={e => setNotifyEmail(e.target.value)}
              placeholder={t.reviews.notifyEmailPh}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── Widget settings ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>🔌</span> {t.reviews.widgetSection}
          </h2>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Widget enabled toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{t.reviews.widgetEnabledLabel}</p>
              <p className="text-xs text-muted-foreground">{t.reviews.widgetEnabledDesc}</p>
            </div>
            <button
              onClick={() => setWidgetEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                widgetEnabled ? 'bg-primary' : 'bg-white/15'
              }`}
              role="switch"
              aria-checked={widgetEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  widgetEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Min rating */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{t.reviews.widgetMinRating}</p>
              <p className="text-xs text-muted-foreground">{t.reviews.widgetMinRatingDesc}</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setMinRating(n)}
                  className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-all ${
                    minRating === n
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20 hover:text-foreground'
                  }`}
                >
                  {n}★
                </button>
              ))}
            </div>
          </div>

          {/* Max count */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{t.reviews.widgetMaxCount}</p>
              <p className="text-xs text-muted-foreground">{t.reviews.widgetMaxCountDesc}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={maxCount}
                onChange={e => setMaxCount(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="w-10 text-center text-sm font-semibold text-foreground tabular-nums">
                {maxCount}
              </span>
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t.reviews.widgetTheme}</p>
            <div className="flex items-center gap-2">
              {(['dark', 'light'] as const).map(th => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    theme === th
                      ? 'bg-white/10 text-foreground border-white/20'
                      : 'bg-white/3 text-muted-foreground border-white/8 hover:border-white/15 hover:text-foreground'
                  }`}
                >
                  {th === 'dark' ? t.reviews.widgetThemeDark : t.reviews.widgetThemeLight}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`px-5 py-2.5 rounded-lg border text-sm font-semibold transition-all disabled:opacity-60 ${saveBtnStyle}`}
        >
          {saveBtnLabel}
        </button>

        {saveState === 'error' && (
          <p className="text-xs text-red-400">{t.reviews.saveError}</p>
        )}
      </div>

    </div>
  )
}
