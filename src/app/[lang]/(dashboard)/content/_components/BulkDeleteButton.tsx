'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/useT'

export function BulkDeleteButton() {
  const router = useRouter()
  const t      = useT()
  const c      = t.content

  const [open, setOpen]         = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function close() {
    if (loading) return
    setOpen(false)
    setPassword('')
    setError(null)
  }

  async function confirmDelete() {
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/drafts/delete-all', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error === 'wrong_password' ? c.wrongPassword : (json.error ?? t.common.error))
        setLoading(false)
        return
      }
      setOpen(false)
      setPassword('')
      router.refresh()
    } catch {
      setError(t.common.error)
      setLoading(false)
    }
  }

  return (
    <>
      {/* Tehlikeli bölge kutusu */}
      <div className="rounded-xl border border-red-500/20 bg-red-950/15 p-4 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <p className="text-sm font-medium text-red-300">⚠️ {c.dangerZone}</p>
          <p className="text-xs text-red-400/70 mt-0.5">{c.deleteAllDesc}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 text-xs px-4 py-2 rounded-lg bg-red-600/90 text-white font-medium hover:bg-red-600 transition-colors whitespace-nowrap"
        >
          🗑 {c.deleteAll}
        </button>
      </div>

      {/* Şifre onay modalı */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-base font-semibold text-foreground">{c.modalTitle}</h3>
                </div>

                <p className="text-sm text-red-300/90 leading-relaxed bg-red-950/30 border border-red-500/20 rounded-lg p-3">
                  {c.modalWarn}
                </p>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {c.passwordLabel}
                  </label>
                  <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmDelete() }}
                    placeholder={c.passwordPh}
                    className="w-full rounded-lg border border-white/12 bg-white/5 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                  {error && <p className="text-xs text-red-400 mt-1.5">❌ {error}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={close}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/12 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={loading || !password}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    {loading ? c.deleting : c.confirmDelete}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
