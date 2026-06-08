'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useT } from '@/lib/useT'

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
  const t = useT()
  const P = t.landing.pricing
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
      <div className="text-center mb-12">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xs font-semibold text-primary uppercase tracking-widest mb-3"
        >
          {P.label}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          {P.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-sm max-w-lg mx-auto"
        >
          {P.subtitle}
        </motion.p>

        {/* Aylık / Yıllık toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/8 mt-7"
        >
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`text-xs px-4 py-2 rounded-lg transition-all font-medium ${
              billingCycle === 'monthly' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {P.monthly}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`text-xs px-4 py-2 rounded-lg transition-all font-medium ${
              billingCycle === 'yearly' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {P.yearly}
            <span className="ml-1.5 text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded-full font-medium">
              {P.save}
            </span>
          </button>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.08 }}
        className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto"
      >
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' && plan.price_yearly
            ? plan.price_yearly / 12
            : plan.price_monthly

          return (
            <motion.div
              key={plan.id}
              variants={item}
              className={`relative rounded-2xl border bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col transition-all hover:-translate-y-1 duration-200 ${
                plan.is_featured
                  ? 'border-primary/40 ring-1 ring-primary/20 shadow-xl shadow-primary/15 ring-aurora'
                  : 'border-white/8'
              }`}
            >
              {plan.is_featured && (
                <div className="h-0.5 bg-gradient-to-r from-sky-500 to-primary" />
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-bold text-foreground text-lg">{plan.name}</p>
                  {plan.is_featured && (
                    <span className="text-[9px] bg-primary/15 text-sky-300 border border-primary/25 px-2 py-0.5 rounded-full font-medium">
                      {P.popular}
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                )}

                <div className="mb-5">
                  <span className="text-4xl font-bold text-foreground">€{price.toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground">{P.perMonth}</span>
                  {billingCycle === 'yearly' && plan.price_yearly && (
                    <p className="text-xs text-sky-300 mt-1">
                      {P.billedYearly.replace('{price}', `€${plan.price_yearly.toFixed(0)}`)}
                    </p>
                  )}
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-sky-400 mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/${lang}/signup`}
                  className={`block text-center text-sm py-2.5 rounded-xl font-medium transition-all mt-auto ${
                    plan.is_featured
                      ? 'bg-gradient-to-r from-sky-500 to-primary text-white hover:opacity-90 shadow-lg shadow-primary/25'
                      : 'border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25'
                  }`}
                >
                  {plan.is_featured ? `${P.ctaFeatured} →` : `${P.ctaDefault} →`}
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
        className="text-center text-xs text-muted-foreground mt-8"
      >
        {P.note}
      </motion.p>
    </section>
  )
}
