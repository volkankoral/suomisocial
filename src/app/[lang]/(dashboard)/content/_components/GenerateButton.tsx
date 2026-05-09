'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SpecialDay } from '@/lib/calendar'

interface Props {
  day: SpecialDay
  orgId: string
  countryCode: string
}

export function GenerateButton({ day, orgId, countryCode }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          countryCode,
          specialDayDate: day.date,
          specialDayName: day.name,
          isBankHoliday:  day.isBankHoliday,
          type:           day.type,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Hata')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? '⏳ Üretiliyor…' : '✨ İçerik Üret'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
