'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Plan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  features: string[]
  is_featured: boolean
  stripe_price_id_monthly?: string | null
  stripe_price_id_yearly?: string | null
}

interface Props {
  plans: Plan[]
  lang: string
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
}

export function PricingSection({ plans, lang }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-5xl px-6 pb-28 pt-8">
      <div className="text-center mb-10">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3"
        >
          Fiyatlandırma
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          Sana uygun planı seç
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-sm max-w-lg mx-auto"
        >
          Her plan için ücretsiz deneme mevcut. Kredi kartı gerekmez.
        </motion.p>

        {/* Aylık / Yıllık toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/8 mt-6"
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`text-xs px-4 py-2 rounded-lg transition-all font-medium ${
              billingCycle === 'monthly'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Aylık
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`text-xs px-4 py-2 rounded-lg transition-all font-medium ${
              billingCycle === 'yearly'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yıllık
            <span className="ml-1.5 text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-medium">
              -20%
            </span>
          </button>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.08 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' && plan.price_yearly
            ? plan.price_yearly / 12
            : plan.price_monthly

          return (
            <motion.div
              key={plan.id}
              variants={item}
              className={`rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:-translate-y-1 duration-200 ${
                plan.is_featured
                  ? 'border-primary/40 ring-1 ring-primary/15 shadow-xl shadow-orange-900/15'
                  : 'border-white/8'
              }`}
            >
              {plan.is_featured && (
                <div className="h-0.5 bg-gradient-to-r from-orange-500 to-pink-600" />
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-bold text-foreground text-lg">{plan.name}</p>
                  {plan.is_featured && (
                    <span className="text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                      Popüler
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                )}

                <div className="mb-5">
                  <span className="text-4xl font-bold text-foreground">€{price.toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground">/ay</span>
                  {billingCycle === 'yearly' && plan.price_yearly && (
                    <p className="text-xs text-green-400 mt-1">
                      Yıllık €{plan.price_yearly.toFixed(0)} olarak faturalanır
                    </p>
                  )}
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/${lang}/login`}
                  className={`block text-center text-sm py-2.5 rounded-xl font-medium transition-all mt-auto ${
                    plan.is_featured
                      ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:opacity-90 shadow-lg shadow-orange-900/25'
                      : 'border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25'
                  }`}
                >
                  {plan.is_featured ? 'Hemen Başla →' : 'Seç →'}
                </Link>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-center text-xs text-muted-foreground mt-6"
      >
        Tüm planlarda kupon kodu desteği · 14 gün para iade garantisi
      </motion.p>
    </section>
  )
}
