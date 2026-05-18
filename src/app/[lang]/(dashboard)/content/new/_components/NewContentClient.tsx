'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

type Category = 'weekly_routine' | 'special_day' | 'campaign'
type MediaMode = 'ai' | 'upload'

interface SpecialDayItem {
  id: string
  name_fi: string
  name_tr: string
  tier: string
  context_fi: string
}

interface RoutineItem {
  id: string
  name_fi: string
  name_tr: string
}

interface UpcomingDay {
  id: string
  name_fi: string
  name_tr: string
  daysUntil: number
  date: string
}

interface Props {
  lang: string
  initialCategory: Category
  initialSpecialDayId?: string
  initialRoutineId?: string
  specialDays: SpecialDayItem[]
  routines: RoutineItem[]
  upcomingDays: UpcomingDay[]
}

export function NewContentClient({
  lang,
  initialCategory,
  initialSpecialDayId,
  initialRoutineId,
  specialDays,
  routines,
  upcomingDays,
}: Props) {
  const router = useRouter()
  const t = useT()
  const n = t.newContent

  const [category, setCategory] = useState<Category>(initialCategory)
  const [specialDayId, setSpecialDayId] = useState(initialSpecialDayId ?? upcomingDays[0]?.id ?? '')
  const [routineId, setRoutineId] = useState(initialRoutineId ?? 'hyvaa-viikonloppua')
  const [campaignBrief, setCampaignBrief] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'facebook'])
  const [aspect, setAspect] = useState<'square' | 'portrait' | 'story'>('square')

  // Media mode: 'ai' = AI üretsin, 'upload' = kullanıcı yüklesin
  const [mediaMode, setMediaMode] = useState<MediaMode>('ai')
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null)
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | null>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setMediaUploadError(null)
    setMediaUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'post-media')

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setMediaUploadError(json.error ?? 'Yükleme başarısız')
      } else {
        setUploadedMediaUrl(json.url)
        setUploadedMediaType(json.mediaType)
      }
    } catch {
      setMediaUploadError('Beklenmeyen hata')
    } finally {
      setMediaUploading(false)
    }
  }

  async function generate() {
    setError(null)

    if (category === 'campaign' && !campaignBrief.trim()) {
      setError(n.errCampaign)
      return
    }
    if (platforms.length === 0) {
      setError(n.errPlatform)
      return
    }
    if (mediaMode === 'upload' && !uploadedMediaUrl) {
      setError(n.errMedia)
      return
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        category,
        specialDayId: category === 'special_day' ? specialDayId : undefined,
        routineId:    category === 'weekly_routine' ? routineId : undefined,
        brief:        category === 'campaign' ? campaignBrief : undefined,
        aspect,
        platforms,
        userMediaUrl:  mediaMode === 'upload' ? uploadedMediaUrl : undefined,
        userMediaType: mediaMode === 'upload' ? uploadedMediaType : undefined,
      }

      const res = await fetch('/api/content/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Üretim başarısız')
        setLoading(false)
        return
      }

      router.push(`/${lang}/content?new=${data.draft.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen hata')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">{n.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{n.subtitle}</p>
      </div>

      {/* Kategori seçimi */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{n.category}</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'weekly_routine', icon: '📅', label: n.weekly },
            { v: 'special_day',    icon: '🎉', label: n.specialDay },
            { v: 'campaign',       icon: '🎨', label: n.campaign },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setCategory(opt.v as Category)}
              className={`rounded-xl border p-3 text-sm transition-all ${
                category === opt.v
                  ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/20'
                  : 'border-white/8 bg-card text-muted-foreground hover:border-white/20'
              }`}
            >
              <span className="text-xl block mb-1">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Kategori-özel alanlar */}
      {category === 'special_day' && (
        <section className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{n.specialDayLbl}</label>
          <select
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-foreground"
            value={specialDayId}
            onChange={e => setSpecialDayId(e.target.value)}
          >
            <optgroup label={n.upcomingDays}>
              {upcomingDays.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name_fi} — {d.daysUntil === 0 ? n.today : `${d.daysUntil} ${n.daysLater}`}
                </option>
              ))}
            </optgroup>
            <optgroup label={n.allDays}>
              {specialDays.map(d => (
                <option key={d.id} value={d.id}>{d.name_fi} ({d.name_tr})</option>
              ))}
            </optgroup>
          </select>
          {specialDayId && (
            <p className="text-xs text-muted-foreground italic mt-1">
              {specialDays.find(d => d.id === specialDayId)?.context_fi}
            </p>
          )}
        </section>
      )}

      {category === 'weekly_routine' && (
        <section className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{n.routine}</label>
          <select
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-foreground"
            value={routineId}
            onChange={e => setRoutineId(e.target.value)}
          >
            {routines.map(r => (
              <option key={r.id} value={r.id}>{r.name_fi} — {r.name_tr}</option>
            ))}
          </select>
        </section>
      )}

      {category === 'campaign' && (
        <section className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{n.campaignDesc}</label>
          <textarea
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 min-h-[120px]"
            placeholder={n.campaignPh}
            value={campaignBrief}
            onChange={e => setCampaignBrief(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{n.campaignHint}</p>
        </section>
      )}

      {/* Görsel / Medya modu */}
      <section className="space-y-3">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{n.mediaMode}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMediaMode('ai')}
            className={`rounded-xl border p-3 text-sm transition-all text-left ${
              mediaMode === 'ai'
                ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/20'
                : 'border-white/8 bg-card text-muted-foreground hover:border-white/20'
            }`}
          >
            <span className="text-xl block mb-1">🤖</span>
            <p className="font-medium">{n.aiGenerate}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{n.aiGenerateDesc}</p>
          </button>
          <button
            type="button"
            onClick={() => setMediaMode('upload')}
            className={`rounded-xl border p-3 text-sm transition-all text-left ${
              mediaMode === 'upload'
                ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/20'
                : 'border-white/8 bg-card text-muted-foreground hover:border-white/20'
            }`}
          >
            <span className="text-xl block mb-1">📁</span>
            <p className="font-medium">{n.ownMedia}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{n.ownMediaDesc}</p>
          </button>
        </div>

        {/* Görsel boyutu — sadece AI modunda */}
        {mediaMode === 'ai' && (
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{n.imageSize}</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { v: 'square',   label: '1:1 (Feed)',   desc: 'IG/FB feed' },
                { v: 'portrait', label: '4:5 (Dikey)',  desc: 'IG dikey' },
                { v: 'story',    label: '9:16 (Story)', desc: 'Story / TT' },
              ].map(a => (
                <button
                  key={a.v}
                  type="button"
                  onClick={() => setAspect(a.v as 'square' | 'portrait' | 'story')}
                  className={`flex-1 rounded-xl border p-3 text-xs transition-all ${
                    aspect === a.v
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-white/8 bg-card text-muted-foreground hover:border-white/20'
                  }`}
                >
                  <p className="font-semibold mb-0.5">{a.label}</p>
                  <p className="text-[10px] opacity-70">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload alanı — sadece upload modunda */}
        {mediaMode === 'upload' && (
          <div className="space-y-2">
            {uploadedMediaUrl ? (
              <div className="rounded-xl border border-white/12 bg-white/4 overflow-hidden relative">
                {uploadedMediaType === 'video' ? (
                  <video
                    src={uploadedMediaUrl}
                    controls
                    className="w-full max-h-64 object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadedMediaUrl}
                    alt="Yüklenen görsel"
                    className="w-full max-h-64 object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUploadedMediaUrl(null)
                    setUploadedMediaType(null)
                    if (mediaInputRef.current) mediaInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ×
                </button>
                <div className="px-3 py-2 text-xs text-muted-foreground border-t border-white/8">
                  {uploadedMediaType === 'video' ? n.uploadedVid : n.uploadedImg} {n.uploadedHint}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                disabled={mediaUploading}
                className="w-full rounded-xl border border-dashed border-white/20 bg-white/4 py-10 flex flex-col items-center gap-2 hover:border-white/30 hover:bg-white/6 transition-all disabled:opacity-40"
              >
                {mediaUploading ? (
                  <>
                    <span className="text-2xl">⏳</span>
                    <span className="text-sm text-muted-foreground">Yükleniyor…</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📤</span>
                    <span className="text-sm text-foreground font-medium">{n.uploadArea}</span>
                    <span className="text-xs text-muted-foreground">{n.uploadTypes}</span>
                  </>
                )}
              </button>
            )}
            {mediaUploadError && (
              <p className="text-xs text-red-400">❌ {mediaUploadError}</p>
            )}
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleMediaUpload}
            />
          </div>
        )}
      </section>

      {/* Platformlar */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{n.platforms}</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'instagram', icon: '📷', label: 'Instagram', color: 'pink' },
            { v: 'facebook',  icon: '👍', label: 'Facebook',  color: 'blue' },
            { v: 'tiktok',    icon: '🎵', label: 'TikTok',    color: 'purple' },
          ].map(p => (
            <button
              key={p.v}
              type="button"
              onClick={() => togglePlatform(p.v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all ${
                platforms.includes(p.v)
                  ? 'border-primary/50 bg-primary/15 text-foreground'
                  : 'border-white/12 bg-white/4 text-muted-foreground hover:border-white/20'
              }`}
            >
              <span>{p.icon}</span> {p.label}
              {platforms.includes(p.v) && <span className="text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Hata */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Üret / Taslak oluştur butonu */}
      <button
        onClick={generate}
        disabled={loading || mediaUploading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading
          ? (mediaMode === 'upload' ? n.captioningBtn : n.generatingBtn)
          : (mediaMode === 'upload' ? n.captionBtn    : n.generateBtn)}
      </button>

      <p className="text-xs text-muted-foreground text-center">{n.afterHint}</p>
    </div>
  )
}
