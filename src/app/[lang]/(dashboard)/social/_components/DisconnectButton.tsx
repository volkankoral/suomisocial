'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  accountId: string
}

export function DisconnectButton({ accountId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDisconnect = async () => {
    if (!confirm('Bu hesabın bağlantısını kesmek istediğinden emin misin?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/social/${accountId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        alert('Bağlantı kesilirken hata oluştu.')
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
      {loading ? 'Kesiliyor…' : 'Bağlantıyı kes'}
    </button>
  )
}
