'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SpecialDay } from '@/lib/calendar'

interface Props {
  day: SpecialDay
  orgId: string
}

export function GenerateButton({ day, orgId }: Props) {
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
          specialDayDate: day.date,
          specialDayLabel: day.label,
          specialDayLabelTr: day.labelTr,
          specialDayDescriptionTr: day.holiday.descriptionTr,
          isBankHoliday: day.holiday.isBankHoliday,
          category: day.holiday.category,
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
        className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        {loading ? '⏳ Üretiliyor…' : '✨ İçerik Üret'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
