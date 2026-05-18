'use client'

import { useState } from 'react'
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

  // Arşivdeki taslaklar — sadece geri al + sil
  if (archived) {
    return (
      <div className="flex items-center gap-2 flex-wrap w-full">
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
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-2 flex-wrap">
        {currentStatus !== 'approved' && currentStatus !== 'posted' && (
          <button onClick={() => updateStatus('approved')} disabled={loading}
            className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}>
            {t.common.approve}
          </button>
        )}

        {currentStatus === 'approved' && (
          <>
            <button onClick={publishToBoth} disabled={publishing}
              className={`${btnBase} bg-gradient-to-r from-pink-600 to-blue-600 text-white hover:opacity-90 flex items-center gap-1.5`}>
              {publishing ? c.publishing : c.publishBoth}
            </button>
            <button onClick={publishToInstagram} disabled={publishing}
              className={`${btnBase} bg-pink-600/20 text-pink-300 border border-pink-500/30 hover:bg-pink-600/30`}>
              {c.publishIg}
            </button>
            <button onClick={publishToFacebook} disabled={publishing}
              className={`${btnBase} bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30`}>
              {c.publishFb}
            </button>
            <button onClick={publishToTikTok} disabled={publishing}
              className={`${btnBase} bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30`}>
              {c.publishTt}
            </button>
            <button onClick={() => updateStatus('pending')} disabled={loading}
              className={`${btnBase} border border-white/12 text-muted-foreground hover:text-foreground`}>
              {c.hold}
            </button>
          </>
        )}

        {currentStatus === 'posted' && (
          <span className={`${btnBase} bg-blue-500/15 text-blue-400 border border-blue-500/20`}>
            {t.status.posted}
          </span>
        )}

        {currentStatus !== 'rejected' && currentStatus !== 'posted' && (
          <button onClick={() => updateStatus('rejected')} disabled={loading}
            className={`${btnBase} bg-red-900/30 text-red-300 hover:opacity-80`}>
            {t.common.reject}
          </button>
        )}

        <button onClick={toggleArchive} disabled={loading}
          className={`${btnBase} border border-white/12 text-muted-foreground hover:text-foreground`}>
          {c.archiveBtn}
        </button>

        {currentStatus !== 'posted' && (
          <button
            onClick={deleteDraft}
            disabled={loading}
            className="text-xs px-2 py-2 sm:py-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40 active:scale-95"
            title={t.common.delete}
          >
            🗑
          </button>
        )}
      </div>

      {pubError && (
        <p className="text-xs text-red-400 leading-snug">{pubError}</p>
      )}
    </div>
  )
}
