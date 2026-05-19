'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/useT'
import { REGION_CONFIG, type Region } from '@/lib/regions'

interface Plan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  features: string[]
  is_featured: boolean
}

interface Props {
  lang: string
  orgId: string
  existingBrand: { id?: string; business_name?: string; tone?: string; logo_url?: string } | null
  plans: Plan[]
  hasSubscription: boolean
}

export function OnboardingWizard({ lang, existingBrand, plans, hasSubscription }: Props) {
  const router = useRouter()
  const t = useT()
  const o = t.onboarding

  const TONES = [
    { value: 'samimi ve sıcak',    label: t.brand.toneWarm },
    { value: 'profesyonel',         label: t.brand.tonePro  },
    { value: 'eğlenceli ve renkli', label: t.brand.toneFun  },
    { value: 'minimalist',          label: t.brand.toneMin  },
  ]

  const [step, setStep] = useState(0)

  // Adım 0 — bölge + site
  const [region, setRegion]       = useState<Region | null>(null)
  const [url, setUrl]             = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null)

  // Adım 1 — marka
  const [businessName, setBusinessName] = useState(existingBrand?.business_name ?? '')
  const [description, setDescription]   = useState('')
  const [products, setProducts]         = useState('')
  const [tone, setTone]                 = useState(existingBrand?.tone ?? 'samimi ve sıcak')
  const [saving, setSaving]             = useState(false)

  // Adım 2 — plan
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const STEPS = [o.regionTitle, o.reviewTitle, t.nav.billing, o.finishTitle]

  async function analyzeSite() {
    if (!url.trim()) return
    setAnalyzing(true)
    setAnalyzeErr(null)
    try {
      const res  = await fetch('/api/onboarding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeErr(o.analyzeError)
        return
      }
      setBusinessName(data.business_name ?? '')
      setDescription(data.description ?? '')
      setProducts(Array.isArray(data.products) ? data.products.join(', ') : '')
      if (data.tone) setTone(data.tone)
      setStep(1)
    } catch {
      setAnalyzeErr(o.analyzeError)
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveBrandAndContinue() {
    if (!businessName.trim() || !region) return
    setSaving(true)
    try {
      await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          description,
          tone,
          products: products.split(',').map(p => p.trim()).filter(Boolean),
          country_code: REGION_CONFIG[region].defaultCountry,
        }),
      })
      // Başlangıç içeriğini arka planda üretmeye başla (beklemeden)
      fetch('/api/onboarding/generate-starter', { method: 'POST' }).catch(() => {})
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  async function subscribe(planId: string) {
    setCheckoutLoading(planId)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: 'monthly' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutLoading(null)
      }
    } catch {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="text-center">
        <img src="/logo.svg" alt="Occaly" className="h-9 w-auto mx-auto mb-3" />
        <h1 className="text-2xl font-bold tracking-tight gradient-text">{o.welcome}</h1>
        <p className="text-sm text-muted-foreground mt-1">{o.welcomeSub}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all shrink-0 ${
              i < step ? 'bg-green-500 border-green-500 text-white'
              : i === step ? 'bg-primary border-primary text-white'
              : 'bg-white/5 border-white/15 text-muted-foreground'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 transition-all ${i < step ? 'bg-green-500/50' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-card p-6 min-h-[320px]">
        <AnimatePresence mode="wait">

          {/* Adım 0 — Bölge + Web sitesi */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{o.regionTitle}</h2>
                <p className="text-sm text-muted-foreground">{o.regionSub}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { v: 'nordic' as Region, flag: '🇫🇮', name: o.regionNordic, desc: o.regionNordicDesc },
                  { v: 'turkey' as Region, flag: '🇹🇷', name: o.regionTurkey, desc: o.regionTurkeyDesc },
                ]).map(r => (
                  <button
                    key={r.v}
                    onClick={() => setRegion(r.v)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      region === r.v ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' : 'border-white/8 bg-white/4 hover:border-white/20'
                    }`}
                  >
                    <p className="text-2xl mb-1.5">{r.flag}</p>
                    <p className="font-semibold text-foreground text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>

              {region && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-1">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{o.siteTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.siteSub}</p>
                  </div>
                  <input
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    placeholder={o.sitePlaceholder}
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && analyzeSite()}
                  />
                  {analyzeErr && <p className="text-xs text-red-400">❌ {analyzeErr}</p>}
                  <button
                    onClick={analyzeSite}
                    disabled={!url.trim() || analyzing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {analyzing ? o.analyzing : o.analyze}
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {o.skipSite}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Adım 1 — Marka onayla */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{o.reviewTitle}</h2>
                <p className="text-sm text-muted-foreground">{o.reviewSub}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{t.brand.businessName} *</label>
                <input
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{t.brand.description}</label>
                <textarea
                  rows={3}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50 resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{t.brand.products}</label>
                <input
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
                  value={products}
                  onChange={e => setProducts(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{t.brand.tone}</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map(tn => (
                    <button
                      key={tn.value}
                      onClick={() => setTone(tn.value)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        tone === tn.value ? 'border-orange-500/50 bg-orange-500/10 text-foreground' : 'border-white/10 bg-card text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      {tn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(0)} className="text-sm px-4 py-2.5 rounded-xl border border-white/12 text-muted-foreground hover:text-foreground">
                  {o.back}
                </button>
                <button
                  onClick={saveBrandAndContinue}
                  disabled={!businessName.trim() || saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {saving ? o.saving : o.next + ' →'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Adım 2 — Plan */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{t.billing.title}</h2>
                <p className="text-sm text-muted-foreground">{t.billing.subtitle}</p>
              </div>

              {hasSubscription ? (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300 text-sm">
                  ✅ {t.status.approved}
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map(plan => (
                    <div key={plan.id} className={`flex items-center justify-between rounded-xl border p-4 ${plan.is_featured ? 'border-primary/40 bg-primary/5' : 'border-white/8 bg-white/2'}`}>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">€{plan.price_monthly}/{lang === 'en' ? 'mo' : 'ay'}</p>
                      </div>
                      <button
                        onClick={() => subscribe(plan.id)}
                        disabled={!!checkoutLoading}
                        className={`text-xs px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                          plan.is_featured ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:opacity-90' : 'border border-white/15 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {checkoutLoading === plan.id ? '…' : '✓'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="text-sm px-4 py-2.5 rounded-xl border border-white/12 text-muted-foreground hover:text-foreground">
                  {o.back}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-muted-foreground hover:text-foreground text-sm transition-all"
                >
                  {o.next} →
                </button>
              </div>
            </motion.div>
          )}

          {/* Adım 3 — Hazır */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center py-6">
              <div className="text-5xl">🎉</div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{o.finishTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{o.starterSub}</p>
              </div>
              <p className="text-sm text-muted-foreground">{o.finishSub}</p>
              <button
                onClick={() => { router.push(`/${lang}/content`); router.refresh() }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {o.goToContent}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
