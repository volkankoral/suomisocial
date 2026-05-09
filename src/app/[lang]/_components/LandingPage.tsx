'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface Props { lang: string }

const FEATURES = [
  {
    icon: '📅',
    gradient: 'from-orange-600/20 to-orange-800/10',
    border: 'group-hover:border-orange-500/30',
    title: 'Yerel Özel Günler',
    desc: 'Resmi tatiller, isim günleri, kültürel etkinlikler — Postino her yerelliği bilir, tek bir günü kaçırmaz.',
  },
  {
    icon: '✨',
    gradient: 'from-purple-600/20 to-purple-800/10',
    border: 'group-hover:border-purple-500/30',
    title: 'AI İçerik Üretimi',
    desc: 'Markana uygun caption, hashtag ve görsel — saniyeler içinde. Her gün için 3 farklı varyant üret, beğendiğini seç.',
  },
  {
    icon: '📲',
    gradient: 'from-pink-600/20 to-pink-800/10',
    border: 'group-hover:border-pink-500/30',
    title: 'Çok Platform',
    desc: 'Instagram, Facebook, TikTok — tek akışta paylaşım. Her post önce sana gelir, sen onaylarsın.',
  },
  {
    icon: '📊',
    gradient: 'from-emerald-600/20 to-emerald-800/10',
    border: 'group-hover:border-emerald-500/30',
    title: 'Reklam Optimizasyonu',
    desc: 'Google Ads ve Meta Ads verilerini tek ekranda gör. AI bütçe önerileriyle ROI&apos;ni artır.',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
}

export function LandingPage({ lang }: Props) {
  return (
    <div className="min-h-screen bg-background overflow-hidden">

      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-orange-500/8 blur-[120px]" />
        <div className="absolute top-1/2 -right-64 w-[600px] h-[600px] rounded-full bg-pink-700/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full bg-purple-900/8 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 border-b border-white/8 bg-background/70 backdrop-blur-2xl px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
              <span className="text-white text-xs font-bold tracking-tight">Po</span>
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">Postino</span>
          </div>
          <Link
            href={`/${lang}/login`}
            className="text-sm px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-orange-900/25"
          >
            Panele Gir →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-400 mb-10 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Beta — yeni dünyaya açılıyor
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
        >
          <span className="text-foreground">Sosyal medyan</span>
          <br />
          <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            otomatik pilotta
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Yerel özel günleri yakalar, AI ile içerik üretir, onayından sonra
          Instagram, Facebook ve TikTok&apos;a tek tıkla paylaşır.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <Link
            href={`/${lang}/login`}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-xl shadow-orange-900/30"
          >
            Ücretsiz Başla →
          </Link>
          <Link
            href={`/${lang}/calendar`}
            className="px-8 py-3.5 rounded-xl border border-white/12 text-zinc-300 font-medium text-sm hover:bg-white/5 hover:border-white/20 transition-all backdrop-blur-sm"
          >
            📅 Takvimi Gör
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
              className="group card-premium p-6 cursor-default"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 text-2xl border border-white/8 ${f.border} transition-colors duration-300`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-base">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bottom CTA strip */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-t border-white/8 bg-white/2 px-6 py-16"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-2xl font-bold mb-3 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            İşletmen yerini bulsun
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            Markanı tanı, takvimini ayarla, içeriği AI üretsin — sen sadece onayla.
          </p>
          <Link
            href={`/${lang}/login`}
            className="inline-flex px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-orange-900/25"
          >
            Başla →
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/8 px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Postino · AI sosyal medya & reklam otomasyonu
        </p>
      </footer>

    </div>
  )
}
