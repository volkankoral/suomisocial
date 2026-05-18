/**
 * Bölge modeli — Occaly iki pazarda çalışır:
 *   - nordic: Finlandiya + komşu Nordic ülkeleri (EUR, Fince/İngilizce içerik)
 *   - turkey: Türkiye (TRY, Türkçe içerik)
 *
 * Bölge, organizasyonun ülke koduna (country_code) göre belirlenir.
 */

export type Region = 'nordic' | 'turkey'

/** İçerik üretiminde kullanılacak birincil dil */
export type ContentLang = 'fi' | 'tr' | 'en' | 'sv'

export interface RegionConfig {
  label:          string
  countries:      string[]      // ISO 3166-1 alpha-2
  currency:       'EUR' | 'TRY'
  defaultCountry: string
  /** AI içeriğinin üretileceği birincil dil */
  contentLang:    ContentLang
  /** UI varsayılan dili */
  uiLang:         'tr' | 'fi' | 'en'
}

export const REGION_CONFIG: Record<Region, RegionConfig> = {
  nordic: {
    label:          'Nordic',
    countries:      ['FI', 'SE', 'NO', 'DK', 'EE'],
    currency:       'EUR',
    defaultCountry: 'FI',
    contentLang:    'fi',
    uiLang:         'fi',
  },
  turkey: {
    label:          'Türkiye',
    countries:      ['TR'],
    currency:       'TRY',
    defaultCountry: 'TR',
    contentLang:    'tr',
    uiLang:         'tr',
  },
}

/** Ülke kodundan bölge belirle (varsayılan: nordic) */
export function getRegionForCountry(code: string | null | undefined): Region {
  if (!code) return 'nordic'
  return REGION_CONFIG.turkey.countries.includes(code.toUpperCase())
    ? 'turkey'
    : 'nordic'
}

/** Bölgenin içerik dili */
export function getContentLang(region: Region): ContentLang {
  return REGION_CONFIG[region].contentLang
}
