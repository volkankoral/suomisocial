'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  draft: {
    caption_fi: string | null
    caption_tr: string | null
    hashtags: string[] | null
    image_url: string | null
    special_day_label_tr: string
  }
  brandName?: string
  igUsername?: string
  logoUrl?: string
}

export function PreviewModal({ draft, brandName = 'yourbrand', igUsername, logoUrl }: Props) {
  const displayIg = igUsername ?? brandName.toLowerCase().replace(/\s+/g, '')
  const initials  = brandName.slice(0, 2).toUpperCase()
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState<'instagram' | 'facebook'>('instagram')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors"
      >
        👁 Önizle
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="w-full max-w-sm bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tab bar */}
              <div className="flex border-b border-white/8">
                {(['instagram', 'facebook'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-xs font-medium transition-colors capitalize ${
                      tab === t
                        ? 'text-foreground border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'instagram' ? '📸 Instagram' : '🔵 Facebook'}
                  </button>
                ))}
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 text-muted-foreground hover:text-foreground text-lg"
                >
                  ×
                </button>
              </div>

              {/* Instagram preview */}
              {tab === 'instagram' && (
                <div className="bg-white text-black">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-none">{displayIg}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Helsinki, Finland</p>
                    </div>
                    <span className="ml-auto text-gray-400 text-lg">···</span>
                  </div>

                  {/* Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    {draft.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.image_url}
                        alt={draft.special_day_label_tr}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        🖼
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 px-3 pt-2.5 text-xl">
                    <span>🤍</span><span>💬</span><span>✈️</span>
                    <span className="ml-auto">🔖</span>
                  </div>

                  {/* Caption */}
                  <div className="px-3 pb-4 pt-1.5">
                    <p className="text-xs leading-relaxed">
                      <span className="font-semibold">{displayIg} </span>
                      {draft.caption_fi ?? ''}
                    </p>
                    {draft.hashtags && draft.hashtags.length > 0 && (
                      <p className="text-xs text-blue-500 mt-1">
                        {draft.hashtags.map((h) => `#${h}`).join(' ')}
                      </p>
                    )}
                    {draft.caption_tr && (
                      <p className="text-[10px] text-gray-400 mt-1.5 italic border-t border-gray-100 pt-1.5">
                        🇹🇷 {draft.caption_tr}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Facebook preview */}
              {tab === 'facebook' && (
                <div className="bg-white text-black">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt={brandName} className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-none">{brandName}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Şimdi · 🌐</p>
                    </div>
                    <span className="ml-auto text-gray-400 text-lg">···</span>
                  </div>

                  {/* Caption first on FB */}
                  <div className="px-3 pb-2">
                    <p className="text-sm leading-relaxed">
                      {draft.caption_fi ?? ''}
                    </p>
                    {draft.hashtags && draft.hashtags.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        {draft.hashtags.map((h) => `#${h}`).join(' ')}
                      </p>
                    )}
                  </div>

                  {/* Image */}
                  <div className="aspect-video bg-gray-100 relative">
                    {draft.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.image_url}
                        alt={draft.special_day_label_tr}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        🖼
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  <div className="flex gap-1 px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
                    <span>👍 Beğen</span>
                    <span className="mx-2">·</span>
                    <span>💬 Yorum</span>
                    <span className="mx-2">·</span>
                    <span>↗️ Paylaş</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
