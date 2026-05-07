/**
 * Finnish calendar utilities — resmi tatiller + bayrak/kültür günleri.
 * Nimipäivä bu sistemde YOK.
 */

import {
  getFinnishHolidays,
  getHolidayForDate,
  type FinnishHoliday,
  type HolidayCategory,
} from './finnish-holidays'

export type { FinnishHoliday, HolidayCategory }

export interface SpecialDay {
  date: string              // YYYY-MM-DD
  holiday: FinnishHoliday
  label: string             // = holiday.name (Fince)
  labelEn: string           // = holiday.nameEn
  labelTr: string           // = holiday.nameTr
  isHighPriority: boolean   // = holiday.isBankHoliday (AI için öncelikli içerik)
}

function toSpecialDay(h: FinnishHoliday): SpecialDay {
  return {
    date: h.date,
    holiday: h,
    label: h.name,
    labelEn: h.nameEn,
    labelTr: h.nameTr,
    isHighPriority: h.isBankHoliday,
  }
}

/** Bir yılın tüm özel günleri (tarihe göre sıralı) */
export function getSpecialDays(year: number): SpecialDay[] {
  return getFinnishHolidays(year).map(toSpecialDay)
}

/** Bugünden itibaren yaklaşan özel günler (en fazla `limit` adet) */
export function getUpcomingSpecialDays(limit = 14): SpecialDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()

  const all = [
    ...getFinnishHolidays(year),
    ...getFinnishHolidays(year + 1),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return all
    .filter((h) => new Date(h.date + 'T00:00:00') >= today)
    .slice(0, limit)
    .map(toSpecialDay)
}

/** Belirli bir tarih için özel günleri döndürür */
export function getSpecialDaysForDate(date: Date): SpecialDay[] {
  const holiday = getHolidayForDate(date)
  if (!holiday) return []
  return [toSpecialDay(holiday)]
}
