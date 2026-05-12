'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TikTokButtonProps {
  hasTikTok: boolean
}

export function TikTokButton({ hasTikTok }: TikTokButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    window.location.href = '/api/oauth/tiktok'
  }

  if (hasTikTok) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
        ✓ TikTok bağlı
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="w-full rounded-lg border border-transparent bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
    >
      {loading ? 'Bağlanıyor…' : '+ TikTok Bağla'}
    </button>
  )
}
