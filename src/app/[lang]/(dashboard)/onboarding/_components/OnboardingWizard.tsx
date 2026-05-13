'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

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

const TONES = [
  { value: 'professional',  label: 'Profesyonel',  emoji: '👔', desc: 'Resmi ve güvenilir' },
  { value: 'friendly',      label: 'Samimi',        emoji: '😊', desc: 'Sıcak ve yakın' },
  { value: 'fun',           label: 'Eğlenceli',     emoji: '🎉', desc: 'Neşeli ve yaratıcı' },
  { value: 'luxurious',     label: 'Lüks',          emoji: '✨', desc: 'Seçkin ve premium' },
]

const STEPS = ['İşletme', 'Marka Tonu', 'Plan', 'Hazır!']

export function OnboardingWizard({ lang, orgId, existingBrand, plans, hasSubscription }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState(existingBrand?.business_name ?? '')
  const [businessType, setBusinessType] = useState('')
  const [tone, setTone] = useState(existingBrand?.tone ?? '')

  async function saveStep1() {
    if (!businessName.trim()) return
    setStep(1)
  }

  async function saveStep2() {
    if (!tone) return
    setStep(2)
  }

  async function saveBrandAndFinish() {
    setLoading(true)
    try {
      await fetch('/api/brand/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, businessType, tone }),
      })
      router.push(`/${lang}/dashboard`)
    } finally {
      setLoading(false)
    }
  }

  async function subscribeAndFinish(planId: string) {
    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: 'monthly' }),
      })
      const data = await res.json()
      if (data.url) {
        // Önce brand'i kaydet
        await fetch('/api/brand/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessName, businessType, tone }),
        })
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Hata oluştu')
        setCheckoutLoading(null)
      }
    } catch {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık + logo */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-900/40 mx-auto mb-4">
          <span className="text-white text-lg font-bold">Po</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">Hoş geldin!</h1>
        <p className="text-sm text-muted-foreground mt-1">Seni {STEPS.length} adımda hazır hale getirelim</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
              i < step
                ? 'bg-green-500 border-green-500 text-white'
                : i === step
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-white/5 border-white/15 text-muted-foreground'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 transition-all ${i < step ? 'bg-green-500/50' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Adımlar */}
      <div className="rounded-2xl border border-white/8 bg-card p-6 min-h-[300px]">
        <AnimatePresence mode="wait">

          {/* Adım 0: İşletme Adı */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">İşletmenizi tanıtalım</h2>
                <p className="text-sm text-muted-foreground">AI içerik üretiminde bu bilgileri kullanacak.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    İşletme Adı *
                  </label>
                  <input
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    placeholder="örn. Napoli Pizza & Grill"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveStep1()}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    İşletme Türü
                  </label>
                  <input
                    className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                    placeholder="örn. Restoran, Kafe, Butik, Kuaför…"
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={saveStep1}
                disabled={!businessName.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Devam →
              </button>
            </motion.div>
          )}

          {/* Adım 1: Ton */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Marka tonun ne?</h2>
                <p className="text-sm text-muted-foreground">AI içerik üretirken bu tonu kullanacak.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      tone === t.value
                        ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20'
                        : 'border-white/8 bg-white/4 hover:border-white/20'
                    }`}
                  >
                    <p className="text-2xl mb-1.5">{t.emoji}</p>
                    <p className="font-semibold text-foreground text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(0)}
                  className="text-sm px-4 py-2.5 rounded-xl border border-white/12 text-muted-foreground hover:text-foreground"
                >
                  ← Geri
                </button>
                <button
                  onClick={saveStep2}
                  disabled={!tone}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Devam →
                </button>
              </div>
            </motion.div>
          )}

          {/* Adım 2: Plan */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Planını seç</h2>
                <p className="text-sm text-muted-foreground">Dilersen ücretsiz devam edip sonra yükseltebilirsin.</p>
              </div>

              {hasSubscription ? (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300 text-sm">
                  ✅ Aktif bir aboneliğin var. Devam et!
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        plan.is_featured ? 'border-primary/40 bg-primary/5' : 'border-white/8 bg-white/2'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground text-sm">{plan.name}</p>
                          {plan.is_featured && (
                            <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full font-medium">Popüler</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">€{plan.price_monthly}/ay</p>
                      </div>
                      <button
                        onClick={() => subscribeAndFinish(plan.id)}
                        disabled={!!checkoutLoading}
                        className={`text-xs px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                          plan.is_featured
                            ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:opacity-90'
                            : 'border border-white/15 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {checkoutLoading === plan.id ? '…' : 'Seç'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm px-4 py-2.5 rounded-xl border border-white/12 text-muted-foreground hover:text-foreground"
                >
                  ← Geri
                </button>
                <button
                  onClick={saveBrandAndFinish}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-muted-foreground hover:text-foreground text-sm transition-all disabled:opacity-40"
                >
                  {loading ? 'Kaydediliyor…' : 'Şimdilik geç, ücretsiz devam et →'}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
