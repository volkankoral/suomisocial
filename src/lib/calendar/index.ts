/**
 * Çok ülkeli takvim — ISO 3166-1 alpha-2 ülke koduna göre resmi tatiller.
 * `date-holidays` paketi 200+ ülkeyi destekler.
 */

import Holidays from 'date-holidays'

export type HolidayCategory = 'public' | 'bank' | 'school' | 'optional' | 'observance'

export interface SpecialDay {
  date: string              // YYYY-MM-DD
  name: string              // Yerel ad (orijinal dil)
  type: HolidayCategory     // public / bank / school / optional / observance
  isBankHoliday: boolean    // 'public' veya 'bank' ise true
  countryCode: string       // ISO 3166-1 alpha-2
  rule?: string
}

interface RawHoliday {
  date: string                    // "2026-05-01 00:00:00" gibi
  name: string
  type: HolidayCategory
  rule?: string
}

function normalizeDate(raw: string): string {
  // "2026-05-01 00:00:00" → "2026-05-01"
  return raw.split(' ')[0]
}

function toSpecialDay(h: RawHoliday, countryCode: string): SpecialDay {
  const isBankHoliday = h.type === 'public' || h.type === 'bank'
  return {
    date:        normalizeDate(h.date),
    name:        h.name,
    type:        h.type,
    isBankHoliday,
    countryCode,
    rule:        h.rule,
  }
}

/** Tek yıl */
export function getSpecialDays(year: number, countryCode: string = 'FI'): SpecialDay[] {
  const hd = new Holidays(countryCode)
  const holidays = (hd.getHolidays(year) ?? []) as RawHoliday[]
  return holidays
    .map((h) => toSpecialDay(h, countryCode))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Bugünden itibaren yaklaşan özel günler */
export function getUpcomingSpecialDays(limit = 14, countryCode: string = 'FI'): SpecialDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()

  const all = [
    ...getSpecialDays(year,     countryCode),
    ...getSpecialDays(year + 1, countryCode),
  ]

  return all
    .filter((h) => new Date(h.date + 'T00:00:00') >= today)
    .slice(0, limit)
}

/** Belirli bir tarih için özel gün */
export function getSpecialDaysForDate(date: Date, countryCode: string = 'FI'): SpecialDay[] {
  const ymd  = date.toISOString().split('T')[0]
  const year = date.getFullYear()
  return getSpecialDays(year, countryCode).filter((h) => h.date === ymd)
}

/** Desteklenen ülkelerin listesi */
export interface CountryOption {
  code: string
  name: string
}

export function getSupportedCountries(): CountryOption[] {
  const hd        = new Holidays()
  const countries = hd.getCountries() as Record<string, string>
  return Object.entries(countries)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
