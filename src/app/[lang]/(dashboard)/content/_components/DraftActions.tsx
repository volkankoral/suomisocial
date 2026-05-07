'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  draftId: string
  currentStatus: string
}

export function DraftActions({ draftId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
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

  async function deleteDraft() {
    if (!confirm('Bu taslağı silmek istediğine emin misin?')) return
    setLoading(true)
    await fetch(`/api/drafts/${draftId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {currentStatus !== 'approved' && (
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          ✓ Onayla
        </button>
      )}
      {currentStatus === 'approved' && (
        <button
          onClick={() => updateStatus('pending')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 font-medium hover:opacity-80 disabled:opacity-40"
        >
          ↩ Beklet
        </button>
      )}
      {currentStatus !== 'rejected' && (
        <button
          onClick={() => updateStatus('rejected')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium hover:opacity-80 disabled:opacity-40"
        >
          ✕ Reddet
        </button>
      )}
      <button
        onClick={deleteDraft}
        disabled={loading}
        className="text-xs px-2 py-1.5 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
        title="Sil"
      >
        🗑
      </button>
    </div>
  )
}
