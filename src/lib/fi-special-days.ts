/**
 * Finlandiya özel günleri — küçük işletmeler için sosyal medya postu üretilecek günler
 *
 * Tipler:
 * - 'major':   En büyük günler, kesin post (Vappu, Juhannus, Joulu, Itsenäisyyspäivä)
 * - 'medium':  Orta önemde günler
 * - 'bonus':   İş koluna özel (pizzacı için Dünya Pizza Günü vb.)
 *
 * Tarih formatları:
 * - Sabit:    'MM-DD'                örn. '05-01' = 1 Mayıs (Vappu)
 * - Hesaplı:  'easter+N' / 'easter-N' örn. 'easter-7' = Palmusunnuntai
 *             'mothers' / 'fathers'  Mayıs/Kasım 2. Pazarı
 *             'midsummer'            Haziran 20-26 arasındaki Cumartesi (Juhannus)
 */

export type SpecialDayTier = 'major' | 'medium' | 'bonus'

export interface SpecialDay {
  /** Benzersiz kimlik (slug) */
  id: string
  /** Tarih ifadesi — bkz. dosya başı yorumu */
  date: string
  /** Fince ad */
  name_fi: string
  /** Türkçe ad (admin referansı için) */
  name_tr: string
  /** Önem seviyesi */
  tier: SpecialDayTier
  /** AI'a verilecek bağlam — bu gün ne anlama geliyor, kültürel detay */
  context_fi: string
  /** Görsel üretiminde kullanılacak ipuçları (FLUX prompt parçası) */
  visual_hint: string
  /** Bu iş koluna uygunsa true (boş = herkese) */
  industries?: string[]
}

export const FI_SPECIAL_DAYS: SpecialDay[] = [
  // === MAJOR — En büyük günler ===
  {
    id: 'uudenvuodenpaiva',
    date: '01-01',
    name_fi: 'Uudenvuodenpäivä',
    name_tr: 'Yeni Yıl',
    tier: 'major',
    context_fi: 'Uusi vuosi alkaa. Toivotetaan asiakkaille onnellista uutta vuotta.',
    visual_hint: 'fireworks, sparkles, gold and blue, festive new year, midnight celebration',
  },
  {
    id: 'vappu',
    date: '05-01',
    name_fi: 'Vappu',
    name_tr: 'Vappu (İşçi/Bahar Bayramı)',
    tier: 'major',
    context_fi: 'Vappu on opiskelijoiden ja työväen juhla. Sima, munkki, valkoiset ylioppilaslakit, piknik puistossa.',
    visual_hint: 'white student cap, balloons, sima drink, munkki donut, spring picnic, festive Finnish street',
  },
  {
    id: 'aitienpaiva',
    date: 'mothers',
    name_fi: 'Äitienpäivä',
    name_tr: 'Anneler Günü',
    tier: 'major',
    context_fi: 'Äitejä juhlitaan. Lämmin ja kiitollinen sävy. Yhdessä syöminen.',
    visual_hint: 'roses, warm family table, mothers day flowers, soft warm light, pink and red flowers',
  },
  {
    id: 'juhannus',
    date: 'midsummer',
    name_fi: 'Juhannus',
    name_tr: 'Juhannus (Yaz Gündönümü)',
    tier: 'major',
    context_fi: 'Vuoden valoisin yö. Kokot, mökki, järvi, koivunlehvät. Kesän tärkein juhla.',
    visual_hint: 'midnight sun, bonfire by lake, birch branches, summer cottage, finnish sauna, golden hour lake',
  },
  {
    id: 'isanpaiva',
    date: 'fathers',
    name_fi: 'Isänpäivä',
    name_tr: 'Babalar Günü',
    tier: 'major',
    context_fi: 'Isiä juhlitaan. Lämmin ja kiitollinen sävy. Hyvä ruoka ja yhdessäolo.',
    visual_hint: 'cozy autumn family table, candlelight, warm tones, fathers day',
  },
  {
    id: 'itsenaisyyspaiva',
    date: '12-06',
    name_fi: 'Itsenäisyyspäivä',
    name_tr: 'Bağımsızlık Günü',
    tier: 'major',
    context_fi: 'Suomen itsenäisyyspäivä. Sinivalkoiset värit, kynttilät ikkunoissa, kunnioittava sävy.',
    visual_hint: 'Finnish flag, blue and white, candles in window at dusk, snowy winter evening',
  },
  {
    id: 'jouluaatto',
    date: '12-24',
    name_fi: 'Jouluaatto',
    name_tr: 'Noel Arifesi',
    tier: 'major',
    context_fi: 'Jouluaatto on Suomessa joulun tärkein päivä. Perhe, kynttilät, joulupöytä.',
    visual_hint: 'christmas eve table, candles, pine branches, red and gold, cozy snowy window',
  },
  {
    id: 'joulupaiva',
    date: '12-25',
    name_fi: 'Joulupäivä',
    name_tr: 'Noel',
    tier: 'major',
    context_fi: 'Joulupäivä. Rauhallinen perhejuhla.',
    visual_hint: 'christmas day, warm fireplace, gifts under tree, snowy landscape',
  },

  // === MEDIUM — Orta önemde günler ===
  {
    id: 'loppiainen',
    date: '01-06',
    name_fi: 'Loppiainen',
    name_tr: 'Epifani',
    tier: 'medium',
    context_fi: 'Joulun loppu. Rauhallinen päivä.',
    visual_hint: 'three kings, star, snowy winter scene, candlelight',
  },
  {
    id: 'ystavanpaiva',
    date: '02-14',
    name_fi: 'Ystävänpäivä',
    name_tr: 'Sevgililer / Arkadaşlar Günü',
    tier: 'medium',
    context_fi: 'Suomessa ystävänpäivä — ei pelkästään romantiikka, vaan kaikki ystävät. Lämmin sävy.',
    visual_hint: 'hearts, friendship, warm pink and red, two coffee cups, cozy cafe',
  },
  {
    id: 'kalevalanpaiva',
    date: '02-28',
    name_fi: 'Kalevalan päivä',
    name_tr: 'Kalevala Günü (Fin Kültürü)',
    tier: 'medium',
    context_fi: 'Suomalaisen kulttuurin päivä. Kansallinen ylpeys.',
    visual_hint: 'finnish forest, traditional kantele, blue and white, mystical nordic atmosphere',
  },
  {
    id: 'naistenpaiva',
    date: '03-08',
    name_fi: 'Kansainvälinen naistenpäivä',
    name_tr: 'Kadınlar Günü',
    tier: 'medium',
    context_fi: 'Naisten päivä. Voimaa ja kiitollisuutta naisille.',
    visual_hint: 'purple flowers, mimosa, strong woman, soft elegant',
  },
  {
    id: 'laskiainen',
    date: 'easter-49',
    name_fi: 'Laskiainen',
    name_tr: 'Karnaval (Laskiainen)',
    tier: 'medium',
    context_fi: 'Laskiaispullat (kermavaahto + hilloa). Lasten pulkkamäki.',
    visual_hint: 'laskiaispulla cream bun, sledding kids, snowy hill, winter joy',
  },
  {
    id: 'paasiainen',
    date: 'easter+0',
    name_fi: 'Pääsiäinen',
    name_tr: 'Paskalya',
    tier: 'medium',
    context_fi: 'Pääsiäinen. Mämmi, pasha, virpomavitsat, keltaiset värit.',
    visual_hint: 'easter eggs, yellow tulips, mammi pudding, willow branches, pastel spring',
  },
  {
    id: 'pyhainpaiva',
    date: '11-01',
    name_fi: 'Pyhäinpäivä',
    name_tr: 'Azizler Günü',
    tier: 'medium',
    context_fi: 'Muistetaan poismenneitä. Kynttilät hautausmaalla. Rauhallinen, lämmin sävy.',
    visual_hint: 'candles in dark, peaceful autumn, soft golden light, memorial',
  },
  {
    id: 'uudenvuodenaatto',
    date: '12-31',
    name_fi: 'Uudenvuodenaatto',
    name_tr: 'Yılbaşı Gecesi',
    tier: 'medium',
    context_fi: 'Vanha vuosi päättyy. Tinanvalanta, ilotulitukset.',
    visual_hint: 'new year fireworks, champagne, midnight, sparkles, celebration crowd',
  },

  // === BONUS — Restoran/Pizzeria için ===
  {
    id: 'maailman-pizzapaiva',
    date: '02-09',
    name_fi: 'Maailman pizzapäivä',
    name_tr: 'Dünya Pizza Günü',
    tier: 'bonus',
    context_fi: 'Pizzan juhlapäivä! Täydellinen tilaisuus pizzerialle.',
    visual_hint: 'wood fired pizza, melting cheese, basil leaves, rustic pizzeria, italian flag colors',
    industries: ['restaurant', 'pizzeria', 'cafe'],
  },
  {
    id: 'pikkujoulu',
    date: '12-01',
    name_fi: 'Pikkujoulukausi alkaa',
    name_tr: 'Mini Noel Sezonu',
    tier: 'bonus',
    context_fi: 'Yritysten ja porukoiden joulujuhlakausi. Tärkeä ravintoloille.',
    visual_hint: 'office christmas party, festive dinner table, glühwein, cozy candles',
    industries: ['restaurant', 'pizzeria', 'cafe', 'bar'],
  },

  // === ROUTINE — Haftalık rutin (özel günler dışında haftanın günlerinde) ===
  // Bu özel bir tip; tarih yerine "her Cuma" gibi.
  // Aşağıdaki ROUTINES dizisinde tutuluyor.
]

export interface RoutinePost {
  id: string
  /** 0=Pazar, 1=Pazartesi, ..., 5=Cuma, 6=Cumartesi */
  weekday: number
  /** Helsinki saatinde 24h format "HH:MM" */
  preferred_time: string
  name_fi: string
  name_tr: string
  context_fi: string
  visual_hint: string
}

export const FI_WEEKLY_ROUTINES: RoutinePost[] = [
  {
    id: 'hyvaa-viikonloppua',
    weekday: 5,                  // Cuma
    preferred_time: '17:00',
    name_fi: 'Hyvää viikonloppua',
    name_tr: 'İyi hafta sonları',
    context_fi: 'Perjantai-illan tervehdys asiakkaille. Rento, lämmin, viikonloppumieli.',
    visual_hint: 'cozy weekend evening, warm lights, friends gathering, friday night vibe',
  },
]

/**
 * Verilen yıl için tüm özel günleri gerçek tarihlerine çözümle (Date objesi).
 * `days` parametresi ile başka bölgenin (örn. Türkiye) günleri de çözümlenebilir.
 */
export function resolveSpecialDays(
  year: number,
  days: SpecialDay[] = FI_SPECIAL_DAYS,
): Array<SpecialDay & { resolvedDate: Date }> {
  return days.map(day => ({
    ...day,
    resolvedDate: resolveDate(day.date, year),
  }))
}

export function resolveDate(expr: string, year: number): Date {
  // Tam ISO tarih YYYY-MM-DD (örn. dini bayramlar — yıla bağlı sabit)
  if (/^\d{4}-\d{2}-\d{2}$/.test(expr)) {
    const [y, m, d] = expr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }

  // Sabit MM-DD
  if (/^\d{2}-\d{2}$/.test(expr)) {
    const [m, d] = expr.split('-').map(Number)
    return new Date(Date.UTC(year, m - 1, d))
  }

  // easter+N veya easter-N
  if (expr.startsWith('easter')) {
    const easter = computeEaster(year)
    const offset = parseInt(expr.replace('easter', '') || '0', 10)
    return new Date(easter.getTime() + offset * 86400000)
  }

  // Mayıs'ın 2. Pazarı
  if (expr === 'mothers') return nthWeekdayOfMonth(year, 4, 0, 2) // 0=Pazar
  // Kasım'ın 2. Pazarı
  if (expr === 'fathers') return nthWeekdayOfMonth(year, 10, 0, 2)

  // Genel: nth:AY(1-12):HAFTAGÜNÜ(0-6):N → o ayın N. haftagünü
  const nthMatch = expr.match(/^nth:(\d+):(\d+):(\d+)$/)
  if (nthMatch) {
    const mo = Number(nthMatch[1]), wd = Number(nthMatch[2]), n = Number(nthMatch[3])
    return nthWeekdayOfMonth(year, mo - 1, wd, n)
  }

  // Juhannus: 20-26 Haziran arasındaki Cumartesi
  if (expr === 'midsummer') {
    for (let d = 20; d <= 26; d++) {
      const dt = new Date(Date.UTC(year, 5, d))
      if (dt.getUTCDay() === 6) return dt   // 6=Cumartesi
    }
  }

  throw new Error(`Bilinmeyen tarih ifadesi: ${expr}`)
}

/** Gregorian Easter (UTC) — anonim Gauss algoritması */
function computeEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const L = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * L) / 451)
  const month = Math.floor((h + L - 7 * m + 114) / 31)
  const day = ((h + L - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

/** year, month (0-11), weekday (0=Pazar) → o ayın n. weekday'i */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, month, 1 + offset + (n - 1) * 7))
}

/**
 * Önümüzdeki N gün için yaklaşan özel günleri döner
 */
export function upcomingSpecialDays(
  daysAhead = 30,
  fromDate = new Date(),
  days: SpecialDay[] = FI_SPECIAL_DAYS,
): Array<SpecialDay & { resolvedDate: Date; daysUntil: number }> {
  const now = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()))
  const limit = new Date(now.getTime() + daysAhead * 86400000)

  const result: Array<SpecialDay & { resolvedDate: Date; daysUntil: number }> = []
  const seen = new Set<string>()

  for (const yearOffset of [0, 1]) {
    const year = fromDate.getUTCFullYear() + yearOffset
    for (const day of days) {
      const resolvedDate = resolveDate(day.date, year)
      // ISO sabit tarihli günler iki yıl döngüsünde tekrar etmesin
      const key = day.id + resolvedDate.toISOString().slice(0, 10)
      if (seen.has(key)) continue
      seen.add(key)
      if (resolvedDate >= now && resolvedDate <= limit) {
        const daysUntil = Math.round((resolvedDate.getTime() - now.getTime()) / 86400000)
        result.push({ ...day, resolvedDate, daysUntil })
      }
    }
  }

  return result.sort((a, b) => a.resolvedDate.getTime() - b.resolvedDate.getTime())
}

/**
 * Bir sonraki Cuma'yı döner (haftalık rutin için)
 */
export function nextFriday(fromDate = new Date()): Date {
  const d = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()))
  const offset = (5 - d.getUTCDay() + 7) % 7 || 7
  return new Date(d.getTime() + offset * 86400000)
}
