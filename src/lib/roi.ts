/**
 * ROI hesabı — Occaly'nin kullanıcıya kazandırdığı para ve zaman.
 *
 * Mantık: AI ile üretilen her içerik, bir ajansa ödenecek ücret + kullanıcının
 * harcayacağı zaman demektir. Bu değer kullanıcıya gösterilir (churn'ü azaltır).
 */

import type { Region } from './regions'

interface RoiRate {
  currency:       string   // gösterim sembolü
  perPost:        number   // ajansın post başına ücreti
  minutesPerPost: number   // bir postun elle hazırlanma süresi
}

export const ROI_RATES: Record<Region, RoiRate> = {
  nordic: { currency: '€', perPost: 35,  minutesPerPost: 30 },
  turkey: { currency: '₺', perPost: 600, minutesPerPost: 30 },
}

export interface RoiInput {
  contentCreated:  number   // toplam üretilen taslak
  published:       number   // paylaşılan post sayısı
  totalReach:      number
  totalEngagement: number
}

export interface RoiSummary extends RoiInput {
  currency:    string
  agencyValue: number       // ajansa ödenecek tahmini tutar
  hoursSaved:  number       // tasarruf edilen saat
}

export function computeRoi(region: Region, input: RoiInput): RoiSummary {
  const rate = ROI_RATES[region]
  return {
    ...input,
    currency:    rate.currency,
    agencyValue: Math.round(input.contentCreated * rate.perPost),
    hoursSaved:  Math.round((input.contentCreated * rate.minutesPerPost) / 60 * 10) / 10,
  }
}
