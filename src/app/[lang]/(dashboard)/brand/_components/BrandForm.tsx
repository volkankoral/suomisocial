'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

interface BrandData {
  id?: string
  business_name?: string
  description?: string | null
  tone?: string | null
  primary_color?: string | null
  products?: string[] | null
  languages?: string[] | null
  logo_url?: string | null
  overlay_text?: boolean | null
  content_language?: string | null
  business_category?: string | null
}

interface CountryOption {
  code: string
  name: string
}

interface Props {
  orgId: string
  brand: BrandData | null
  countryCode: string
  countries: CountryOption[]
}

export function BrandForm({ brand, countryCode, countries }: Props) {
  const router = useRouter()
  const t      = useT()
  const b      = t.brand

  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [logoUrl, setLogoUrl]             = useState<string | null>(brand?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]         = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const TONE_OPTIONS = [
    { value: 'samimi ve sıcak',    label: b.toneWarm },
    { value: 'profesyonel',         label: b.tonePro  },
    { value: 'eğlenceli ve renkli', label: b.toneFun  },
    { value: 'minimalist',          label: b.toneMin  },
  ]

  const [form, setForm] = useState({
    business_name:    brand?.business_name ?? '',
    description:      brand?.description ?? '',
    tone:             brand?.tone ?? 'samimi ve sıcak',
    primary_color:    brand?.primary_color ?? '#f97316',
    products:         Array.isArray(brand?.products) ? (brand.products as string[]).join(', ') : '',
    country_code:      countryCode,
    overlay_text:      brand?.overlay_text !== false,
    content_language:  brand?.content_language ?? '',   // '' = auto/null
    business_category: brand?.business_category ?? 'restaurant',
  })

  const CATEGORY_OPTIONS = [
    { value: 'restaurant', label: b.catRestaurant },
    { value: 'beauty',     label: b.catBeauty },
    { value: 'retail',     label: b.catRetail },
    { value: 'fitness',    label: b.catFitness },
    { value: 'services',   label: b.catServices },
    { value: 'other',      label: b.catOther },
  ]

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'brand-logo')
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) setLogoError(json.error ?? t.common.error)
      else setLogoUrl(json.url)
    } catch { setLogoError(t.common.error) }
    finally { setLogoUploading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res  = await fetch('/api/brand', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name:    form.business_name,
          description:      form.description,
          tone:             form.tone,
          primary_color:    form.primary_color,
          products:          form.products.split(',').map(p => p.trim()).filter(Boolean),
          country_code:      form.country_code,
          logo_url:          logoUrl,
          overlay_text:      form.overlay_text,
          content_language:  form.content_language || null,  // '' → null (auto)
          business_category: form.business_category,
        }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error ?? `${t.common.error} (${res.status})`)
      else { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 3000) }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error)
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-6">

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {b.logo} <span className="text-muted-foreground font-normal">{b.logoOptional}</span>
        </label>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl border border-white/12 bg-white/4 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-white/25 transition-colors"
            onClick={() => logoInputRef.current?.click()}
          >
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              : <span className="text-2xl opacity-30">🏷</span>}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="text-xs px-3 py-2 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors disabled:opacity-40"
            >
              {logoUploading ? t.common.uploading : logoUrl ? b.logoChange : b.logoUpload}
            </button>
            {logoUrl && (
              <button type="button" onClick={() => { setLogoUrl(null); if (logoInputRef.current) logoInputRef.current.value = '' }}
                className="block text-xs text-red-400/70 hover:text-red-400 transition-colors">
                {b.logoRemove}
              </button>
            )}
            {logoError && <p className="text-xs text-red-400">❌ {logoError}</p>}
            <p className="text-[10px] text-muted-foreground/60">{b.logoFormats}</p>
          </div>
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* Ülke */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {b.country} <span className="text-muted-foreground font-normal ml-1">{b.countryHint}</span>
        </label>
        <select
          value={form.country_code}
          onChange={e => setForm(f => ({ ...f, country_code: e.target.value }))}
          className="w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        >
          {countries.map(c => (
            <option key={c.code} value={c.code} className="bg-zinc-900">{c.name} ({c.code})</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1.5">{b.countryDesc}</p>
      </div>

      {/* İşletme adı */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{b.businessName}</label>
        <input
          type="text" required
          value={form.business_name}
          onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
          className="w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          placeholder="Örn. Bella Pizzeria"
        />
      </div>

      {/* Sektör */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {b.category} <span className="text-muted-foreground font-normal ml-1">{b.categoryHint}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                form.business_category === opt.value
                  ? 'border-orange-500/50 bg-orange-500/10 text-foreground'
                  : 'border-white/10 bg-card text-muted-foreground hover:border-white/20 hover:text-foreground'
              }`}
            >
              <input type="radio" name="business_category" value={opt.value}
                checked={form.business_category === opt.value}
                onChange={e => setForm(f => ({ ...f, business_category: e.target.value }))}
                className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {b.description} <span className="text-muted-foreground font-normal ml-1">{b.descHint}</span>
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40 resize-none"
        />
      </div>

      {/* Ton */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{b.tone}</label>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                form.tone === opt.value
                  ? 'border-orange-500/50 bg-orange-500/10 text-foreground'
                  : 'border-white/10 bg-card text-muted-foreground hover:border-white/20 hover:text-foreground'
              }`}
            >
              <input type="radio" name="tone" value={opt.value} checked={form.tone === opt.value}
                onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Ürünler */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {b.products} <span className="text-muted-foreground font-normal ml-1">{b.productsHint}</span>
        </label>
        <input
          type="text"
          value={form.products}
          onChange={e => setForm(f => ({ ...f, products: e.target.value }))}
          className="w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        />
      </div>

      {/* Ana renk */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{b.color}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.primary_color}
            onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
            className="h-10 w-16 rounded-lg border border-white/10 cursor-pointer"
          />
          <span className="text-sm font-mono text-muted-foreground">{form.primary_color}</span>
        </div>
      </div>

      {/* Overlay toggle */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{b.overlay}</label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setForm(f => ({ ...f, overlay_text: !f.overlay_text }))}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.overlay_text ? 'bg-orange-500' : 'bg-white/15'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.overlay_text ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <div>
            <p className="text-sm text-foreground">{form.overlay_text ? b.overlayOn : b.overlayOff}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{b.overlayDesc}</p>
          </div>
        </label>
      </div>

      {/* İçerik Dili */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{b.contentLang}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: '',   label: b.contentLangAuto },
            { value: 'fi', label: b.contentLangFi },
            { value: 'tr', label: b.contentLangTr },
            { value: 'en', label: b.contentLangEn },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                form.content_language === opt.value
                  ? 'border-orange-500/50 bg-orange-500/10 text-foreground'
                  : 'border-white/10 bg-card text-muted-foreground hover:border-white/20 hover:text-foreground'
              }`}
            >
              <input
                type="radio"
                name="content_language"
                value={opt.value}
                checked={form.content_language === opt.value}
                onChange={e => setForm(f => ({ ...f, content_language: e.target.value }))}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{b.contentLangHint}</p>
      </div>

      {/* Kaydet */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || logoUploading}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? t.common.saving : t.common.save}
        </button>
        {saved  && <p className="text-sm text-green-400 font-medium">{t.common.saved}</p>}
        {error  && <p className="text-sm text-red-400 font-medium">❌ {error}</p>}
      </div>
    </form>
  )
}
