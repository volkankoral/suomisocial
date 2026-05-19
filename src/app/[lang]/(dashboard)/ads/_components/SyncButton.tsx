'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

interface Props {
  hasGoogle: boolean
  hasMeta:   boolean
}

export function SyncButton({ hasGoogle, hasMeta }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<string | null>(null)
  const router = useRouter()
  const t = useT()
  const a = t.ads
  // t.common used as fallback for generic error

  async function sync() {
    setLoading(true)
    setResult(null)
    let totalSynced = 0
    const errors: string[] = []

    try {
      if (hasMeta) {
        const res  = await fetch('/api/ads/sync', { method: 'POST' })
        const json = await res.json()
        if (res.ok) totalSynced += json.synced ?? 0
        else errors.push(`Meta: ${json.error}`)
      }
      if (hasGoogle) {
        const res  = await fetch('/api/ads/sync-google', { method: 'POST' })
        const json = await res.json()
        if (res.ok) totalSynced += json.synced ?? 0
        else errors.push(`Google: ${json.error}`)
      }

      if (errors.length) setResult(`✕ ${errors.join(' | ')}`)
      else setResult(a.synced.replace('{n}', String(totalSynced)))
      router.refresh()
    } catch (err) {
      setResult(`✕ ${err instanceof Error ? err.message : t.common.error}`)
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
            {a.syncing}
          </>
        ) : (
          <>{a.syncBtn}</>
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
