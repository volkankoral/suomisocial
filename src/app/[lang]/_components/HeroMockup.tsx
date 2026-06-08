'use client'

import { motion } from 'framer-motion'

interface Copy {
  badgeAi:     string
  badgeReady:  string
  postCaption: string
  postTag1:    string
  postTag2:    string
  postTag3:    string
  approve:     string
  calendarChip:string
  occasionsChip:string
}

/** Küçük platform rozeti */
function PlatformBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

/**
 * Hero ürün mockup'ı — bir "uygulama penceresi" içinde AI tarafından
 * üretilmiş bir sosyal medya gönderisinin önizlemesi. Çevreye dağılmış
 * yüzen bilgi çipleri ile canlı, premium bir his verir.
 */
export function HeroMockup({ copy }: { copy: Copy }) {
  return (
    <div className="relative mx-auto w-full max-w-md">

      {/* Arka plan blue glow */}
      <div className="absolute -inset-8 rounded-[2rem] bg-primary/15 blur-3xl" />

      {/* App window */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ perspective: 1000 }}
        className="relative glass-heavy rounded-2xl border border-white/10 shadow-2xl shadow-primary/20 overflow-hidden"
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1 text-[10px] text-zinc-400">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="opacity-70">
              <path d="M12 1l3 6 6 .9-4.5 4.3 1 6.3L12 21l-5.5 3.5 1-6.3L3 7.9 9 7z" fill="currentColor" />
            </svg>
            occaly.com/dashboard
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Post preview card */}
          <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">

            {/* Görsel alanı */}
            <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/30 via-sky-500/15 to-indigo-600/20 overflow-hidden">
              {/* dekoratif "fotoğraf" katmanları */}
              <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_30%,oklch(0.85_0.12_220/0.5),transparent_55%)]" />
              <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_75%_70%,oklch(0.70_0.20_280/0.45),transparent_50%)]" />

              {/* AI rozet */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 18 }}
                className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-medium text-white"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                {copy.badgeAi}
              </motion.div>

              {/* Yayına hazır rozet */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="absolute bottom-3 right-3 rounded-full bg-green-500/20 border border-green-400/30 px-2.5 py-1 text-[10px] font-medium text-green-300"
              >
                ✓ {copy.badgeReady}
              </motion.div>
            </div>

            {/* Caption + meta */}
            <div className="p-3.5">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3"
              >
                {copy.postCaption}
              </motion.p>

              {/* Hashtagler */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="mt-2.5 flex flex-wrap gap-1.5"
              >
                {[copy.postTag1, copy.postTag2, copy.postTag3].map((tag) => (
                  <span key={tag} className="rounded-md bg-primary/10 text-primary/90 text-[10px] px-1.5 py-0.5 font-medium">
                    {tag}
                  </span>
                ))}
              </motion.div>

              {/* Aksiyon satırı */}
              <div className="mt-3.5 flex items-center justify-between gap-2 pt-3 border-t border-white/8">
                <div className="flex items-center gap-1.5">
                  <PlatformBadge className="bg-gradient-to-br from-fuchsia-500 to-orange-400">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>
                  </PlatformBadge>
                  <PlatformBadge className="bg-[#1877F2]">
                    <span className="text-[13px] font-bold leading-none">f</span>
                  </PlatformBadge>
                  <PlatformBadge className="bg-black border border-white/15">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3v3.5a5.5 5.5 0 0 0 4 1.6v3a8.5 8.5 0 0 1-4-1.2V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V3z"/></svg>
                  </PlatformBadge>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6 }}
                  className="rounded-lg bg-gradient-to-r from-sky-500 to-primary px-3 py-1.5 text-[10px] font-semibold text-white shadow-lg shadow-primary/30"
                >
                  {copy.approve} →
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Yüzen çip: takvim / Vappu */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.1, type: 'spring', stiffness: 180, damping: 16 }}
        className="absolute -right-4 -top-5 sm:-right-10 animate-float"
      >
        <div className="glass-heavy rounded-xl border border-white/10 px-3 py-2 shadow-xl flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-sm">📅</div>
          <div>
            <p className="text-[10px] font-semibold text-foreground leading-tight">{copy.calendarChip}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">+1 gün</p>
          </div>
        </div>
      </motion.div>

      {/* Yüzen çip: özel gün sayısı */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.3, type: 'spring', stiffness: 180, damping: 16 }}
        className="absolute -left-4 bottom-8 sm:-left-12 animate-float-slow"
      >
        <div className="glass-heavy rounded-xl border border-white/10 px-3 py-2 shadow-xl flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sm">✨</div>
          <p className="text-[10px] font-semibold text-foreground leading-tight max-w-[90px]">{copy.occasionsChip}</p>
        </div>
      </motion.div>

    </div>
  )
}
