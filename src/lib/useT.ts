'use client'

import { useParams } from 'next/navigation'
import { translations, type Lang, type T } from './translations'

export function useT(): T {
  const params = useParams()
  const lang = (params?.lang as Lang) ?? 'tr'
  return translations[lang] ?? translations.tr
}

export { translations, type Lang, type T }
