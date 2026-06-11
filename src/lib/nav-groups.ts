/**
 * Dashboard ikincil navigasyon grupları.
 *
 * Üst menü 6 ana öğeye indirildi. Bazı öğeler altında ikincil sekme çubuğu
 * (SectionTabs) ile ilişkili sayfalar gruplanır:
 *   • content    → Üret / Takvim / Yayınlar
 *   • automation → Zamanlanmış (autopilot) / Haftalık Plan (agent)
 *   • settings   → Hesaplar / Marka / Abonelik
 *
 * `labelKey` translations.navGroups içindeki sekme etiketine işaret eder.
 */
import type { T } from '@/lib/translations'

export type NavGroupKey = 'content' | 'automation' | 'settings'

export interface NavGroupTab {
  /** route segment, ör. 'content' → /[lang]/content */
  segment:  string
  /** translations.navGroups içindeki anahtar */
  labelKey: keyof T['navGroups']
}

export const NAV_GROUPS: Record<NavGroupKey, NavGroupTab[]> = {
  content: [
    { segment: 'content',  labelKey: 'tGenerate' },
    { segment: 'calendar', labelKey: 'tCalendar' },
    { segment: 'posts',    labelKey: 'tPosts' },
  ],
  automation: [
    { segment: 'autopilot', labelKey: 'tAutopilot' },
    { segment: 'agent',     labelKey: 'tAgent' },
  ],
  settings: [
    { segment: 'social',  labelKey: 'tAccounts' },
    { segment: 'brand',   labelKey: 'tBrand' },
    { segment: 'billing', labelKey: 'tBilling' },
  ],
}

/** Bir route segment'inin hangi gruba ait olduğunu bulur (yoksa null). */
export function groupForSegment(segment: string): NavGroupKey | null {
  for (const key of Object.keys(NAV_GROUPS) as NavGroupKey[]) {
    if (NAV_GROUPS[key].some(t => t.segment === segment)) return key
  }
  return null
}
