'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useT } from '@/lib/useT'
import { HeroMockup } from './HeroMockup'
import { PricingSection } from './PricingSection'

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
  lang: string
  plans?: Plan[]
}

/* ── Inline SVG feature icons (emoji yerine — profesyonel) ── */
const ICONS: Record<string, React.ReactNode> = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><rect x="3" y="4.5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="8" cy="13.5" r="1.3" fill="currentColor"/><circle cx="12" cy="13.5" r="1.3" fill="currentColor"/></svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" fill="currentColor"/></svg>
  ),
  broadcast: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 20v-6M12 20V7M17 20v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M5 11l4-4 3 2 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
}

export function LandingPage({ lang, plans = [] }: Props) {
  const t = useT()
  const L = t.landing

  const features = [
    { icon: 'calendar',  color: 'text-sky-300',     bg: 'from-sky-500/15 to-blue-700/5',     title: L.features.f1Title, desc: L.features.f1Desc },
    { icon: 'sparkles',  color: 'text-primary',     bg: 'from-primary/15 to-indigo-700/5',   title: L.features.f2Title, desc: L.features.f2Desc },
    { icon: 'broadcast', color: 'text-cyan-300',    bg: 'from-cyan-500/15 to-sky-700/5',     title: L.features.f3Title, desc: L.features.f3Desc },
    { icon: 'chart',     color: 'text-indigo-300',  bg: 'from-indigo-500/15 to-blue-700/5',  title: L.features.f4Title, desc: L.features.f4Desc },
  ]

  const steps = [
    { n: '01', title: L.how.step1Title, desc: L.how.step1Desc },
    { n: '02', title: L.how.step2Title, desc: L.how.step2Desc },
    { n: '03', title: L.how.step3Title, desc: L.how.step3Desc },
  ]

  const stats = [
    { num: L.trust.s1num, lbl: L.trust.s1lbl },
    { num: L.trust.s2num, lbl: L.trust.s2lbl },
    { num: L.trust.s3num, lbl: L.trust.s3lbl },
    { num: L.trust.s4num, lbl: L.trust.s4lbl },
  ]

  const mockupCopy = {
    badgeAi:      L.showcase.badgeAi,
    badgeReady:   L.showcase.badgeReady,
    postCaption:  L.showcase.postCaption,
    postTag1:     L.showcase.postTag1,
    postTag2:     L.showcase.postTag2,
    postTag3:     L.showcase.postTag3,
    approve:      t.common.approve.replace(/^✓\s*/, ''),
    calendarChip: L.showcase.postTag1.replace('#', ''),
    occasionsChip:`${L.trust.s3num} ${L.trust.s3lbl}`,
  }

  const langs: { code: string; label: string }[] = [
    { code: 'fi', label: 'FI' },
    { code: 'en', label: 'EN' },
    { code: 'tr', label: 'TR' },
  ]

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-72 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/12 blur-[140px]" />
        <div className="absolute top-1/3 -right-72 w-[600px] h-[600px] rounded-full bg-sky-600/10 blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-[560px] h-[460px] rounded-full bg-indigo-800/10 blur-[120px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href={`/${lang}`} className="flex items-center">
            <img src="/logo.svg" alt="Occaly" className="h-7 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how"      className="hover:text-foreground transition-colors">{L.nav.how}</a>
            <a href="#features" className="hover:text-foreground transition-colors">{L.nav.features}</a>
            <a href="#pricing"  className="hover:text-foreground transition-colors">{L.nav.pricing}</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-white/5 border border-white/8 p-0.5">
              {langs.map((l) => (
                <Link
                  key={l.code}
                  href={`/${l.code}`}
                  className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                    l.code === lang ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <Link href={`/${lang}/login`} className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              {L.nav.login}
            </Link>
            <Link
              href={`/${lang}/signup`}
              className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              {L.nav.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="absolute inset-0 bg-grid mask-fade pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-24 lg:pt-28 grid lg:grid-cols-2 gap-16 items-center">

          {/* Sol: metin */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs text-sky-200 mb-7 backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              {L.badge}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl sm:text-6xl lg:text-[4.2rem] font-bold tracking-tight leading-[1.03] mb-6"
            >
              <span className="text-foreground">{L.hero.title1}</span>
              <br />
              <span className="text-brand-gradient">{L.hero.title2}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed"
            >
              {L.hero.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center justify-center lg:justify-start gap-3 flex-wrap"
            >
              <Link
                href={`/${lang}/signup`}
                className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-all shadow-xl shadow-primary/30 active:scale-[0.98]"
              >
                {L.hero.ctaPrimary} →
              </Link>
              <a
                href="#how"
                className="px-7 py-3.5 rounded-xl border border-white/12 text-zinc-300 font-medium text-sm hover:bg-white/5 hover:border-white/20 transition-all backdrop-blur-sm"
              >
                {L.hero.ctaSecondary}
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-5 text-xs text-muted-foreground/70"
            >
              {L.hero.trustNote}
            </motion.p>
          </div>

          {/* Sağ: mockup */}
          <div className="relative">
            <HeroMockup copy={mockupCopy} />
          </div>
        </div>
      </section>

      {/* ── Trust / stats ── */}
      <section className="relative z-10 border-y border-white/8 bg-white/2">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-8">{L.trust.label}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-2xl sm:text-3xl font-bold text-brand-gradient">{s.num}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{s.lbl}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{L.how.label}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{L.how.title}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{L.how.subtitle}</p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* bağlayıcı çizgi */}
          <div className="hidden md:block absolute top-9 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.12 }}
              className="relative text-center md:text-left"
            >
              <div className="relative z-10 mx-auto md:mx-0 mb-5 w-16 h-16 rounded-2xl glass-heavy border border-white/10 flex items-center justify-center text-xl font-bold text-brand-gradient glow-blue-sm">
                {s.n}
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{L.features.label}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{L.features.title}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">{L.features.subtitle}</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ staggerChildren: 0.1 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group card-premium p-7 cursor-default"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-5 border border-white/8 ${f.color}`}>
                {ICONS[f.icon]}
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-base">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Showcase ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl border border-white/8 bg-gradient-to-b from-white/3 to-transparent p-8 sm:p-14 text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{L.showcase.label}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{L.showcase.title}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-12">{L.showcase.subtitle}</p>

          <div className="max-w-md mx-auto">
            <HeroMockup copy={mockupCopy} />
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      {plans.length > 0 && <PricingSection plans={plans} lang={lang} />}

      {/* ── Final CTA ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-sky-600/8 to-indigo-700/10 px-8 py-16 text-center"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/20 blur-[100px] pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{L.cta.title}</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">{L.cta.subtitle}</p>
            <Link
              href={`/${lang}/signup`}
              className="inline-flex px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-xl shadow-primary/30"
            >
              {L.cta.button} →
            </Link>
            <p className="mt-4 text-xs text-muted-foreground/70">{L.hero.trustNote}</p>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/8 px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Occaly" className="h-6 w-auto" />
            <span className="text-xs text-muted-foreground hidden sm:inline">· {L.footer.tagline}</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href={`/${lang}/privacy`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{L.footer.privacy}</Link>
            <span className="text-white/20 text-xs">·</span>
            <Link href={`/${lang}/terms`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{L.footer.terms}</Link>
            <span className="text-white/20 text-xs">·</span>
            <Link href={`/${lang}/cookie`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{L.footer.cookie}</Link>
          </div>
          <p className="text-xs text-muted-foreground/60">{L.footer.rights}</p>
        </div>
      </footer>

    </div>
  )
}
