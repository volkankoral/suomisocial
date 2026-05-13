'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  features: string[]
  is_featured: boolean
  stripe_price_id_monthly?: string | null
  stripe_price_id_yearly?: string | null
}

interface Subscription {
  id: string
  status: string
  billing_cycle: string
  current_period_end: string
  is_manual: boolean
  plans: Plan | null
}

interface Props {
  subscription: Subscription | null
  plans: Plan[]
  hasStripeCustomer: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Aktif',          color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  trialing:  { label: 'Deneme',         color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  past_due:  { label: 'Ödeme Gerekli',  color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  canceled:  { label: 'İptal Edildi',   color: 'bg-white/8 text-muted-foreground border-white/10' },
  inactive:  { label: 'Pasif',          color: 'bg-white/8 text-muted-foreground border-white/10' },
}

export function BillingClient({ subscription, plans, hasStripeCustomer }: Props) {
  const searchParams = useSearchParams()
  const success  = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  const currentPlanId = subscription?.plans?.id

  async function subscribe(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Bir hata oluştu')
      }
    } finally {
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Portal açılamadı')
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Abonelik & Faturalama</h1>
        <p className="mt-1 text-sm text-muted-foreground">Planını yönet, fatura geçmişini gör</p>
      </div>

      {/* Başarı / İptal mesajları */}
      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-green-300 text-sm">
          ✅ Aboneliğin başarıyla başlatıldı! Planın birkaç dakika içinde aktifleşecek.
        </div>
      )}
      {canceled && (
        <div className="rounded-xl border border-white/12 bg-white/4 px-5 py-4 text-muted-foreground text-sm">
          ℹ️ Ödeme iptal edildi. İstediğin zaman tekrar deneyebilirsin.
        </div>
      )}

      {/* Mevcut Abonelik */}
      <section className="rounded-xl border border-white/8 bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Mevcut Plan</h2>

        {subscription ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold text-foreground">{subscription.plans?.name ?? 'Bilinmeyen Plan'}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  STATUS_LABELS[subscription.status]?.color ?? STATUS_LABELS.inactive.color
                }`}>
                  {STATUS_LABELS[subscription.status]?.label ?? subscription.status}
                </span>
                {subscription.is_manual && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 font-medium">
                    Manuel
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription.billing_cycle === 'monthly' ? 'Aylık' : 'Yıllık'} ·{' '}
                €{subscription.plans?.price_monthly?.toFixed(2)}/ay
              </p>
              {subscription.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Sonraki yenileme: {new Date(subscription.current_period_end).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>

            {hasStripeCustomer && !subscription.is_manual && (
              <button
                onClick={openPortal}
                disabled={loading === 'portal'}
                className="text-sm px-4 py-2 rounded-xl border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25 transition-all disabled:opacity-40"
              >
                {loading === 'portal' ? 'Açılıyor…' : '🔧 Faturalama Yönetimi'}
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-muted-foreground text-sm">Aktif aboneliğin yok</p>
            <p className="text-xs text-muted-foreground mt-1">Aşağıdan bir plan seçerek başla</p>
          </div>
        )}
      </section>

      {/* Plan Seçimi */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Planlar</h2>

          {/* Aylık / Yıllık toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                billingCycle === 'monthly'
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                billingCycle === 'yearly'
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yıllık
              <span className="ml-1.5 text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            const price = billingCycle === 'yearly' && plan.price_yearly
              ? plan.price_yearly / 12
              : plan.price_monthly
            const hasStripePrice = billingCycle === 'yearly'
              ? !!plan.stripe_price_id_yearly
              : !!plan.stripe_price_id_monthly
            const isLoading = loading === plan.id

            return (
              <div
                key={plan.id}
                className={`rounded-xl border bg-card overflow-hidden flex flex-col transition-all ${
                  plan.is_featured
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : isCurrent
                    ? 'border-green-500/30'
                    : 'border-white/8'
                }`}
              >
                {plan.is_featured && (
                  <div className="h-0.5 bg-gradient-to-r from-orange-500 to-pink-600" />
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      )}
                    </div>
                    {plan.is_featured && (
                      <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        ⭐ Popüler
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-foreground">
                      €{price.toFixed(0)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ay</span>
                    {billingCycle === 'yearly' && plan.price_yearly && (
                      <p className="text-xs text-green-400 mt-0.5">
                        €{plan.price_yearly.toFixed(0)}/yıl olarak faturalanır
                      </p>
                    )}
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-1.5 mb-5 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={() => !isCurrent && subscribe(plan.id)}
                    disabled={isCurrent || isLoading || !hasStripePrice}
                    className={`w-full text-sm py-2.5 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-auto ${
                      isCurrent
                        ? 'bg-green-900/30 text-green-400 border border-green-500/20'
                        : plan.is_featured
                        ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:opacity-90 shadow-lg shadow-orange-900/25'
                        : 'border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25'
                    }`}
                  >
                    {isLoading
                      ? 'Yönlendiriliyor…'
                      : isCurrent
                      ? '✓ Mevcut Plan'
                      : !hasStripePrice
                      ? 'Yakında'
                      : plan.is_featured
                      ? 'Başla →'
                      : 'Seç →'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Sorular */}
      <section className="rounded-xl border border-white/8 bg-card/50 p-5">
        <h2 className="text-sm font-semibold mb-3 text-foreground">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><span className="text-foreground font-medium">Plan değiştirebilir miyim?</span> — Evet, istediğin zaman plan değiştirebilirsin. Fark hesaplanarak uygulanır.</p>
          <p><span className="text-foreground font-medium">İptal nasıl yapılır?</span> — &quot;Faturalama Yönetimi&quot; butonu üzerinden Stripe portalına girerek aboneliğini iptal edebilirsin.</p>
          <p><span className="text-foreground font-medium">İndirim kuponu var mı?</span> — Ödeme sayfasında kupon kodu girebilirsin.</p>
        </div>
      </section>
    </div>
  )
}
