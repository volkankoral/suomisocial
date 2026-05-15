'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = 'weekly_routine' | 'special_day' | 'campaign'

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

  const [category, setCategory] = useState<Category>(initialCategory)
  const [specialDayId, setSpecialDayId] = useState(initialSpecialDayId ?? upcomingDays[0]?.id ?? '')
  const [routineId, setRoutineId] = useState(initialRoutineId ?? 'hyvaa-viikonloppua')
  const [campaignBrief, setCampaignBrief] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'facebook'])
  const [aspect, setAspect] = useState<'square' | 'portrait' | 'story'>('square')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function generate() {
    setError(null)

    if (category === 'campaign' && !campaignBrief.trim()) {
      setError('Kampanya açıklaması zorunlu')
      return
    }
    if (platforms.length === 0) {
      setError('En az bir platform seç')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/content/generate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          specialDayId: category === 'special_day' ? specialDayId : undefined,
          routineId:    category === 'weekly_routine' ? routineId : undefined,
          brief:        category === 'campaign' ? campaignBrief : undefined,
          aspect,
          platforms,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Üretim başarısız')
        setLoading(false)
        return
      }

      // Başarılıysa içerik listesine git (henüz preview modali yok)
      router.push(`/${lang}/content?new=${data.draft.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen hata')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">Yeni İçerik Hazırla</h1>
        <p className="text-sm text-muted-foreground mt-1">AI hem caption hem görseli üretecek</p>
      </div>

      {/* Kategori seçimi */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Kategori</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'weekly_routine', icon: '📅', label: 'Haftalık' },
            { v: 'special_day',    icon: '🎉', label: 'Özel Gün' },
            { v: 'campaign',       icon: '🎨', label: 'Kampanya' },
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
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Özel Gün</label>
          <select
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-foreground"
            value={specialDayId}
            onChange={e => setSpecialDayId(e.target.value)}
          >
            <optgroup label="Yaklaşan günler">
              {upcomingDays.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name_fi} — {d.daysUntil === 0 ? 'Bugün' : `${d.daysUntil} gün sonra`}
                </option>
              ))}
            </optgroup>
            <optgroup label="Tüm özel günler">
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
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Rutin</label>
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
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Kampanya Açıklaması</label>
          <textarea
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 min-h-[120px]"
            placeholder={`Örnek:\n"Cuma ve cumartesi akşamları tüm pizzalarda %30 indirim. Aile büyük boy alana 1 lt cola bedava."\n\nNe kadar detaylı yazarsan AI o kadar iyi içerik üretir.`}
            value={campaignBrief}
            onChange={e => setCampaignBrief(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Fince üretilecek — sen Türkçe yazsan da olur.</p>
        </section>
      )}

      {/* Platformlar */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Paylaşılacak Platformlar</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'instagram', icon: '📷', label: 'Instagram', color: 'pink' },
            { v: 'facebook',  icon: '👍', label: 'Facebook',  color: 'blue' },
            { v: 'tiktok',    icon: '🎵', label: 'TikTok',    color: 'purple' },
          ].map(p => (
            <button
              key={p.v}
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

      {/* Görsel boyutu */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Görsel Boyutu</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'square',   label: '1:1 (Feed)',     desc: 'IG/FB ana feed' },
            { v: 'portrait', label: '4:5 (Dikey)',    desc: 'IG dikey post' },
            { v: 'story',    label: '9:16 (Story)',   desc: 'Story / TikTok' },
          ].map(a => (
            <button
              key={a.v}
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
      </section>

      {/* Hata */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Üret butonu */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? '🪄 AI üretiyor, ~10 saniye sürer…' : '🪄 İçeriği Üret'}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Üretim sonrası caption ve görseli düzenleyebilir veya yeniden üretebilirsin.
      </p>
    </div>
  )
}
