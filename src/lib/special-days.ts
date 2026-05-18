/**
 * Bölgeye göre özel gün erişimi.
 * Nordic → FI günleri, Turkey → TR günleri.
 *
 * Bütün tüketiciler (içerik üretimi, takvim, dashboard) bu modülü kullanmalı.
 */

import {
  FI_SPECIAL_DAYS,
  FI_WEEKLY_ROUTINES,
  upcomingSpecialDays,
  resolveSpecialDays,
  type SpecialDay,
  type RoutinePost,
} from './fi-special-days'
import { TR_SPECIAL_DAYS, TR_WEEKLY_ROUTINES } from './tr-special-days'
import type { Region } from './regions'

/** Bölgenin özel gün listesi */
export function getSpecialDays(region: Region): SpecialDay[] {
  return region === 'turkey' ? TR_SPECIAL_DAYS : FI_SPECIAL_DAYS
}

/** Bölgenin haftalık rutinleri */
export function getWeeklyRoutines(region: Region): RoutinePost[] {
  return region === 'turkey' ? TR_WEEKLY_ROUTINES : FI_WEEKLY_ROUTINES
}

/** Bölge için tek özel günü id ile bul */
export function findSpecialDay(region: Region, id: string): SpecialDay | undefined {
  return getSpecialDays(region).find(d => d.id === id)
}

/** Bölge için tek rutini id ile bul */
export function findRoutine(region: Region, id: string): RoutinePost | undefined {
  return getWeeklyRoutines(region).find(r => r.id === id)
}

/** Bölge için yaklaşan özel günler */
export function getUpcoming(region: Region, daysAhead = 90, fromDate = new Date()) {
  return upcomingSpecialDays(daysAhead, fromDate, getSpecialDays(region))
}

/** Bölge için belirli yıldaki tüm günlerin çözümlenmiş tarihleri */
export function getResolvedSpecialDays(region: Region, year: number) {
  return resolveSpecialDays(year, getSpecialDays(region))
}

export type { SpecialDay, RoutinePost }
