'use client'

import { useT } from '@/lib/useT'

interface Props {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'google_business'
  lang: string
}

export function ConnectButton({ platform }: Props) {
  const t = useT()
  const s = t.social

  const handleConnect = () => {
    if (platform === 'instagram' || platform === 'facebook') {
      window.location.href = `/api/oauth/meta?platform=${platform}`
    } else if (platform === 'tiktok') {
      window.location.href = '/api/oauth/tiktok'
    } else if (platform === 'google_business') {
      window.location.href = '/api/oauth/google-business'
    }
  }

  return (
    <button
      onClick={handleConnect}
      className="w-full text-sm px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/20"
    >
      {s.connectBtn}
    </button>
  )
}
