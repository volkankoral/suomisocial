'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

interface AutopilotSettings {
  enabled:         boolean
  day_of_week:     number
  drafts_per_run:  number
  last_run_at:     string | null
}

interface Draft {
  id:                string
  category:          string
  special_day_label: string | null
  caption_fi:        string | null
  caption_tr:        string | null
  hashtags:          string[] | null
  image_url:         string | null
  created_at:        string
  status:            string
}

interface Props {
  lang:            string
  isPro:           boolean
  initialSettings: AutopilotSettings | null
  initialDrafts:   Draft[]
}

const DAY_NAMES = {
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  fi: ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

export function AutopilotPage({ lang, isPro, initialSettings, initialDrafts }: Props) {
  const t      = useT()
  const ap     = t.autopilot
  const router = useRouter()

  const [settings, setSettings] = useState<AutopilotSettings>(
    initialSettings ?? { enabled: false, day_of_week: 1, drafts_per_run: 4, last_run_at: null }
  )
  const [drafts, setDrafts]     = useState<Draft[]>(initialDrafts)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveErr, setSaveErr]   = useState<string | null>(null)

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const dayNames = DAY_NAMES[lang as keyof typeof DAY_NAMES] ?? DAY_NAMES.en

  async function saveSettings() {
    setSaving(true); setSaved(false); setSaveErr(null)
    try {
      const res  = await fetch('/api/autopilot/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      })
      const json = await res.json()
      if (!res.ok) setSaveErr(json.error ?? t.common.error)
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch {
      setSaveErr(t.common.error)
    } finally { setSaving(false) }
  }

  async function approveDraft(draftId: string) {
    setApproving(draftId)
    try {
      await fetch(`/api/drafts/${draftId}/approve`, { method: 'POST' })
      setDrafts(ds => ds.filter(d => d.id !== draftId))
      router.refresh()
    } catch { /* silent */ } finally { setApproving(null) }
  }

  async function rejectDraft(draftId: string) {
    setRejecting(draftId)
    try {
      await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' })
      setDrafts(ds => ds.filter(d => d.id !== draftId))
    } catch { /* silent */ } finally { setRejecting(null) }
  }

  const pendingDrafts = drafts.filter(d => d.status === 'pending')

  return (
    <div className="max-w-3xl space-y-8">

      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">{ap.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{ap.subtitle}</p>
      </div>

      {/* Pro değilse gate */}
      {!isPro && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center space-y-3">
          <p className="text-2xl">⚡</p>
          <p className="font-semibold text-foreground">{ap.proRequired}</p>
          <p className="text-sm text-muted-foreground">{ap.proRequiredDesc}</p>
          <a
            href={`/${lang}/billing`}
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {ap.upgradeBtn}
          </a>
        </div>
      )}

      {/* Ayarlar */}
      <div className={`rounded-2xl border border-white/8 bg-card p-6 space-y-6 ${!isPro ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{ap.settingsTitle}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{ap.settingsDesc}</p>
          </div>
          {/* Master toggle */}
          <button
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${settings.enabled ? 'bg-primary' : 'bg-white/15'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Gün seçici */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">{ap.dayLabel}</label>
          <div className="flex flex-wrap gap-2">
            {dayNames.map((name, i) => (
              <button
                key={i}
                onClick={() => setSettings(s => ({ ...s, day_of_week: i }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  settings.day_of_week === i
                    ? 'bg-primary/20 border border-primary/40 text-foreground'
                    : 'border border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Taslak sayısı */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
            {ap.draftsLabel} — <span className="text-foreground font-semibold">{settings.drafts_per_run}</span>
          </label>
          <input
            type="range"
            min={1} max={7}
            value={settings.drafts_per_run}
            onChange={e => setSettings(s => ({ ...s, drafts_per_run: Number(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
          </div>
        </div>

        {/* Son çalışma */}
        {settings.last_run_at && (
          <p className="text-xs text-muted-foreground">
            🕐 {ap.lastRun}: {new Date(settings.last_run_at).toLocaleString(lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB')}
          </p>
        )}

        {/* Kaydet */}
        <div className="flex items-center gap-3 pt-1 border-t border-white/8">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? t.common.saving : t.common.save}
          </button>
          {saved   && <p className="text-sm text-green-400">{t.common.saved}</p>}
          {saveErr && <p className="text-sm text-red-400">❌ {saveErr}</p>}
        </div>
      </div>

      {/* Bilgi kartı */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-2">
        <p className="text-sm font-semibold text-foreground">⚡ {ap.howTitle}</p>
        <ul className="space-y-1.5">
          {[ap.how1, ap.how2, ap.how3, ap.how4].map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-sky-300 shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bekleyen taslaklar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">
            🤖 {ap.pendingTitle}
            {pendingDrafts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-primary/20 text-sky-300 font-normal">
                {pendingDrafts.length}
              </span>
            )}
          </h2>
        </div>

        {pendingDrafts.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-8 text-center">
            <p className="text-3xl mb-2">🗓️</p>
            <p className="text-sm text-muted-foreground">{ap.noPending}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{ap.noPendingHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDrafts.map(draft => {
              const caption = lang === 'tr' ? draft.caption_tr : draft.caption_fi
              return (
                <div key={draft.id} className="rounded-2xl border border-white/8 bg-card overflow-hidden">
                  <div className="flex gap-4 p-4">
                    {/* Görsel */}
                    {draft.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.image_url}
                        alt={draft.special_day_label ?? 'draft'}
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-2xl opacity-30">🖼</span>
                      </div>
                    )}

                    {/* İçerik */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-muted-foreground">
                          {draft.category === 'special_day' ? '🎉 ' + (draft.special_day_label ?? 'Özel Gün')
                            : '📅 Haftalık Rutin'}
                        </span>
                        <span className="text-xs text-muted-foreground/50">
                          {new Date(draft.created_at).toLocaleDateString(lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-3">{caption}</p>
                      {draft.hashtags && draft.hashtags.length > 0 && (
                        <p className="text-xs text-sky-300/70 truncate">
                          {draft.hashtags.slice(0, 5).map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Aksiyon butonları */}
                  <div className="flex gap-2 px-4 pb-4">
                    <button
                      onClick={() => approveDraft(draft.id)}
                      disabled={approving === draft.id || rejecting === draft.id}
                      className="flex-1 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-40"
                    >
                      {approving === draft.id ? '…' : t.common.approve}
                    </button>
                    <a
                      href={`/${lang}/content`}
                      className="flex-1 py-2 rounded-lg border border-white/12 text-muted-foreground text-sm text-center font-medium hover:text-foreground hover:border-white/25 transition-colors"
                    >
                      ✏️ {ap.editInContent}
                    </a>
                    <button
                      onClick={() => rejectDraft(draft.id)}
                      disabled={approving === draft.id || rejecting === draft.id}
                      className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400/70 text-sm font-medium hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-40"
                    >
                      {rejecting === draft.id ? '…' : '✕'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
