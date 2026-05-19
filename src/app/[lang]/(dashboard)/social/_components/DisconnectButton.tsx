'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/useT'

interface Props {
  accountId: string
}

export function DisconnectButton({ accountId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useT()
  const s = t.social

  const handleDisconnect = async () => {
    if (!confirm(s.disconnectConfirm)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/social/${accountId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        alert(s.disconnectErr)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? s.disconnecting : s.disconnect}
    </button>
  )
}
