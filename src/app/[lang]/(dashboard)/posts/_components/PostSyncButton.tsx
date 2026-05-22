'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

export function PostSyncButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<string | null>(null)
  const router = useRouter()
  const t = useT()
  const p = t.posts

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const res  = await fetch('/api/posts/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? p.syncErr)
      let msg = `✓ ${p.synced.replace('{n}', String(json.synced))}`
      if (json.errors?.length) msg += ` — Hata: ${json.errors.join(', ')}`
      setResult(msg)
      router.refresh()
    } catch (err) {
      setResult(`✕ ${err instanceof Error ? err.message : p.syncErr}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sync}
        disabled={loading}
        className="text-sm px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {p.syncing}
          </>
        ) : (
          <>{p.syncBtn}</>
        )}
      </button>
      {result && (
        <span className={`text-xs font-medium ${result.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
          {result}
        </span>
      )}
    </div>
  )
}
