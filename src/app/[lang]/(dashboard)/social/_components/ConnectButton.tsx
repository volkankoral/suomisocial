'use client'

import { useRouter } from 'next/navigation'

interface Props {
  platform: 'instagram' | 'facebook' | 'tiktok'
  lang: string
}

export function ConnectButton({ platform, lang }: Props) {
  const router = useRouter()

  const handleConnect = () => {
    if (platform === 'instagram' || platform === 'facebook') {
      window.location.href = `/api/oauth/meta?platform=${platform}`
    } else if (platform === 'tiktok') {
      router.push(`/${lang}/social?info=tiktok_coming_soon`)
    }
  }

  return (
    <button
      onClick={handleConnect}
      className="w-full text-sm px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-900/20"
    >
      + Bağla
    </button>
  )
}
