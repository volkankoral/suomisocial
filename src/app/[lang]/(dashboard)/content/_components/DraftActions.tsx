'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

interface Props {
  draftId: string
  currentStatus: string
  archived?: boolean
}

export function DraftActions({ draftId, currentStatus, archived = false }: Props) {
  const [loading, setLoading]       = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [pubError, setPubError]     = useState<string | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [menuPos, setMenuPos]       = useState<{ top: number; right: number } | null>(null)
  const menuBtnRef                  = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const t      = useT()
  const c      = t.content

  async function updateStatus(status: string) {
    setLoading(true)
    await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  async function postTo(endpoint: string) {
    const res  = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Paylaşım hatası')
    return json
  }

  async function publishToInstagram() {
    setPublishing(true)
    setPubError(null)
    try {
      await postTo('/api/post/instagram')
      router.refresh()
    } catch (err) {
      setPubError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setPublishing(false)
    }
  }

  async function publishToFacebook() {
    setPublishing(true)
    setPubError(null)
    try {
      await postTo('/api/post/facebook')
      router.refresh()
    } catch (err) {
      setPubError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setPublishing(false)
    }
  }

  async function publishToBoth() {
    setPublishing(true)
    setPubError(null)
    const errors: string[] = []
    try {
      const results = await Promise.allSettled([
        postTo('/api/post/instagram'),
        postTo('/api/post/facebook'),
      ])
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const platform = i === 0 ? 'Instagram' : 'Facebook'
          errors.push(`${platform}: ${r.reason?.message ?? 'hata'}`)
        }
      })
      if (errors.length > 0) setPubError(errors.join(' · '))
      router.refresh()
    } catch (err) {
      setPubError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setPublishing(false)
    }
  }

  async function publishToTikTok() {
    setPublishing(true)
    setPubError(null)
    try {
      await postTo('/api/post/tiktok')
      router.refresh()
    } catch (err) {
      setPubError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setPublishing(false)
    }
  }

  async function deleteDraft() {
    if (!confirm(c.deleteConfirm)) return
    setLoading(true)
    await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  async function toggleArchive() {
    setLoading(true)
    await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !archived }),
    })
    setLoading(false)
    router.refresh()
  }

  const btnBase = 'text-xs px-3 py-2 sm:py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 active:scale-95'

  // ── Taşma menüsü (ikincil aksiyonlar: Beklet / Arşivle / Sil) ──────────────
  const overflowItems: { label: string; onClick: () => void; danger?: boolean }[] = []
  if (currentStatus === 'approved') overflowItems.push({ label: `⏸ ${c.hold}`, onClick: () => updateStatus('pending') })
  overflowItems.push({ label: `📦 ${c.archiveBtn}`, onClick: toggleArchive })
  if (currentStatus !== 'posted') overflowItems.push({ label: `🗑 ${t.common.delete}`, onClick: deleteDraft, danger: true })

  function toggleMenu() {
    if (menuOpen) { setMenuOpen(false); return }
    const rect = menuBtnRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    setMenuOpen(true)
  }

  function OverflowMenu() {
    if (overflowItems.length === 0) return null
    return (
      <>
        <button
          ref={menuBtnRef}
          onClick={toggleMenu}
          disabled={loading}
          className="text-xs px-2.5 py-2 sm:py-1.5 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/24 transition-colors disabled:opacity-40"
          title="Diğer işlemler"
        >
          ⋯
        </button>
        {menuOpen && menuPos && typeof document !== 'undefined' && createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
            <div
              className="fixed z-[61] min-w-[150px] rounded-xl border border-white/12 bg-[#11151c] shadow-2xl py-1 overflow-hidden"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {overflowItems.map((it, i) => (
                <button
                  key={i}
                  onClick={() => { setMenuOpen(false); it.onClick() }}
                  disabled={loading}
                  className={`w-full text-left text-xs px-3 py-2 transition-colors disabled:opacity-40 ${
                    it.danger ? 'text-red-300 hover:bg-red-500/10' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
      </>
    )
  }

  // ── Arşivdeki taslaklar — sadece geri al + sil ──────────────────────────────
  if (archived) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={toggleArchive} disabled={loading}
          className={`${btnBase} bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30`}>
          {c.unarchiveBtn}
        </button>
        <button
          onClick={deleteDraft}
          disabled={loading}
          className="text-xs px-2 py-2 sm:py-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40 active:scale-95"
          title={t.common.delete}
        >
          🗑
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* PENDING / REJECTED → Onayla */}
        {currentStatus !== 'approved' && currentStatus !== 'posted' && (
          <button onClick={() => updateStatus('approved')} disabled={loading}
            className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}>
            ✓ {t.common.approve}
          </button>
        )}

        {/* APPROVED → birincil yayın + platform segmenti */}
        {currentStatus === 'approved' && (
          <>
            <button onClick={publishToBoth} disabled={publishing}
              className={`${btnBase} bg-gradient-to-r from-sky-500 to-primary text-white hover:opacity-90`}>
              {publishing ? c.publishing : `📤 ${c.publishBoth}`}
            </button>
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
              <button onClick={publishToInstagram} disabled={publishing} title="Instagram"
                className="text-xs px-2.5 py-1.5 rounded-md text-sky-300 hover:bg-primary/15 transition-colors disabled:opacity-40">
                {c.publishIg}
              </button>
              <button onClick={publishToFacebook} disabled={publishing} title="Facebook"
                className="text-xs px-2.5 py-1.5 rounded-md text-blue-300 hover:bg-blue-600/20 transition-colors disabled:opacity-40">
                {c.publishFb}
              </button>
              <button onClick={publishToTikTok} disabled={publishing} title="TikTok"
                className="text-xs px-2.5 py-1.5 rounded-md text-purple-300 hover:bg-purple-600/20 transition-colors disabled:opacity-40">
                {c.publishTt}
              </button>
            </div>
          </>
        )}

        {/* POSTED → rozet */}
        {currentStatus === 'posted' && (
          <span className={`${btnBase} bg-blue-500/15 text-blue-400 border border-blue-500/20`}>
            ✓ {t.status.posted}
          </span>
        )}

        {/* Reddet */}
        {currentStatus !== 'rejected' && currentStatus !== 'posted' && (
          <button onClick={() => updateStatus('rejected')} disabled={loading}
            className={`${btnBase} bg-red-900/30 text-red-300 hover:opacity-80`}>
            {t.common.reject}
          </button>
        )}

        {/* Taşma menüsü */}
        <OverflowMenu />
      </div>

      {pubError && (
        <p className="text-xs text-red-400 leading-snug">{pubError}</p>
      )}
    </div>
  )
}
