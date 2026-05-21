'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/useT'

interface Props {
  accountId: string
  platformName?: string
}

export function DisconnectButton({ accountId, platformName }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading]     = useState(false)
  const t = useT()
  const s = t.social

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/social/${accountId}`, { method: 'DELETE' })
      if (res.ok) {
        setShowModal(false)
        router.refresh()
      } else {
        // Modal içinde hata göster
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Tetikleyici buton */}
      <button
        onClick={() => setShowModal(true)}
        className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
      >
        {s.disconnect}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !loading && setShowModal(false)}
            />

            {/* Dialog */}
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">

                {/* İkon + başlık */}
                <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center text-2xl">
                    🔌
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">
                      {s.disconnectConfirmTitle ?? 'Bağlantıyı Kes'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {platformName
                        ? (s.disconnectConfirmDesc ?? 'Bu hesabın bağlantısını kesmek istediğinden emin misin?').replace('{platform}', platformName)
                        : (s.disconnectConfirm ?? 'Bu hesabın bağlantısını kesmek istediğinden emin misin?')}
                    </p>
                  </div>
                </div>

                {/* Butonlar */}
                <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors disabled:opacity-40"
                  >
                    {s.cancel ?? 'İptal'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:border-red-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/40 border-t-red-400 animate-spin" />
                        <span>{s.disconnecting ?? 'Kesiliyor…'}</span>
                      </>
                    ) : (
                      s.disconnect ?? 'Bağlantıyı Kes'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
