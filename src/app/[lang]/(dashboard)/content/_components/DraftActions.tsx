'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftId: string
  currentStatus: string
}

export function DraftActions({ draftId, currentStatus }: Props) {
  const [loading, setLoading]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [pubError, setPubError]   = useState<string | null>(null)
  const router = useRouter()

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

  async function publishToFacebook() {
    setPublishing(true)
    setPubError(null)
    try {
      const res  = await fetch('/api/post/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Paylaşım hatası')
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
      const res  = await fetch('/api/post/tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Paylaşım hatası')
      router.refresh()
    } catch (err) {
      setPubError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setPublishing(false)
    }
  }

  async function deleteDraft() {
    if (!confirm('Bu taslağı silmek istediğine emin misin?')) return
    setLoading(true)
    await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {currentStatus !== 'approved' && currentStatus !== 'posted' && (
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
          >
            ✓ Onayla
          </button>
        )}

        {currentStatus === 'approved' && (
          <>
            <button
              onClick={publishToFacebook}
              disabled={publishing}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {publishing ? '⏳ Paylaşılıyor…' : '🔵 Facebook\'a Paylaş'}
            </button>
            <button
              onClick={publishToTikTok}
              disabled={publishing}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {publishing ? '⏳ Paylaşılıyor…' : '🎵 TikTok\'a Paylaş'}
            </button>
            <button
              onClick={() => updateStatus('pending')}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              ↩ Beklet
            </button>
          </>
        )}

        {currentStatus === 'posted' && (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
            ✓ Paylaşıldı
          </span>
        )}

        {currentStatus !== 'rejected' && currentStatus !== 'posted' && (
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-300 font-medium hover:opacity-80 disabled:opacity-40"
          >
            ✕ Reddet
          </button>
        )}

        {currentStatus !== 'posted' && (
          <button
            onClick={deleteDraft}
            disabled={loading}
            className="text-xs px-2 py-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
            title="Sil"
          >
            🗑
          </button>
        )}
      </div>

      {pubError && (
        <p className="text-xs text-red-400">{pubError}</p>
      )}
    </div>
  )
}
