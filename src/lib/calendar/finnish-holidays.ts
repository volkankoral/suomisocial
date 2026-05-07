/**
 * Finnish public holidays + flag days — computed for any year.
 *
 * category 'bankholiday' → resmi tatil, işyerleri kapalı
 * category 'observed'    → tanınan gün ama resmi tatil değil (Noel Arifesi, Juhannus Arifesi)
 * category 'flagday'     → ulusal bayrak çekilir, kültürel önemi var (Runeberg, Kalevala…)
 */

export type HolidayCategory = 'bankholiday' | 'observed' | 'flagday'

export interface FinnishHoliday {
  date: string            // YYYY-MM-DD
  name: string            // Fince ad
  nameEn: string          // İngilizce
  nameTr: string          // Türkçe
  isBankHoliday: boolean  // İşyerleri/bankalar kapalı
  isFlagDay: boolean      // Ulusal bayrak çekilir
  category: HolidayCategory
  descriptionTr: string   // AI içerik üretimi için kısa Türkçe bağlam
}

// ── Tarih yardımcıları ────────────────────────────────────────────────────────

function easterSunday(year: number): Date {
  // Anonim Gregoryan algoritması
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
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function fmt(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Juhannus: Haziran 20–26 arasındaki Cumartesi */
function midsummerDay(year: number): Date {
  for (let day = 20; day <= 26; day++) {
    const d = new Date(year, 5, day)
    if (d.getDay() === 6) return d
  }
  throw new Error('Midsummer Saturday bulunamadı')
}

/** Pyhäinpäivä: Ekim 31 – Kasım 6 arasındaki Cumartesi */
function allSaintsDay(year: number): Date {
  const candidates = [
    new Date(year, 9, 31),
    new Date(year, 10, 1),
    new Date(year, 10, 2),
    new Date(year, 10, 3),
    new Date(year, 10, 4),
    new Date(year, 10, 5),
    new Date(year, 10, 6),
  ]
  return candidates.find((d) => d.getDay() === 6)!
}

/** Ayın n'inci Pazarı. month 0-indexed (4=Mayıs, 10=Kasım) */
function nthSunday(year: number, month: number, n: number): Date {
  let count = 0
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day)
    if (d.getMonth() !== month) break
    if (d.getDay() === 0) {
      count++
      if (count === n) return d
    }
  }
  throw new Error(`${month + 1}. ayda ${n}. Pazar bulunamadı`)
}

// ── Ana fonksiyon ─────────────────────────────────────────────────────────────

export function getFinnishHolidays(year: number): FinnishHoliday[] {
  const easter     = easterSunday(year)
  const midsummer  = midsummerDay(year)
  const saints     = allSaintsDay(year)
  const mothersDay = nthSunday(year, 4, 2)   // Mayıs'ın 2. Pazarı
  const fathersDay = nthSunday(year, 10, 2)  // Kasım'ın 2. Pazarı

  const holidays: FinnishHoliday[] = [
    // ── RESMİ TATİLLER (bankholiday) ─────────────────────────────────────────
    {
      date: `${year}-01-01`,
      name: 'Uudenvuodenpäivä',
      nameEn: "New Year's Day",
      nameTr: 'Yılbaşı',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Yeni yılın ilk günü. Havai fişekler ve şampanyayla kutlanır. "Hyvää uutta vuotta!"',
    },
    {
      date: `${year}-01-06`,
      name: 'Loppiainen',
      nameEn: 'Epiphany',
      nameTr: 'Loppiainen',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Hristiyan takviminde Üç Bilgeler\'i anma günü. Yılbaşı sezonunun resmi sonu.',
    },
    {
      date: fmt(addDays(easter, -2)),
      name: 'Pitkäperjantai',
      nameEn: 'Good Friday',
      nameTr: 'Kutsal Cuma',
      isBankHoliday: true,
      isFlagDay: false,
      category: 'bankholiday',
      descriptionTr: 'Paskalya öncesi Cuma. Finlandiya\'nın en sessiz resmi tatil günlerinden biri.',
    },
    {
      date: fmt(easter),
      name: 'Pääsiäispäivä',
      nameEn: 'Easter Sunday',
      nameTr: 'Paskalya Pazarı',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Paskalya Pazarı. Çikolata yumurtaları ve aile yemekleri geleneği var. "Hyvää pääsiäistä!"',
    },
    {
      date: fmt(addDays(easter, 1)),
      name: 'Toinen pääsiäispäivä',
      nameEn: 'Easter Monday',
      nameTr: 'Paskalya Pazartesisi',
      isBankHoliday: true,
      isFlagDay: false,
      category: 'bankholiday',
      descriptionTr: 'Paskalya\'nın ikinci resmi tatil günü.',
    },
    {
      date: `${year}-05-01`,
      name: 'Vappu',
      nameEn: 'May Day / Vappu',
      nameTr: 'Vappu',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Finlandiya\'nın en renkli sokak festivali! Öğrenciler mezuniyet keplerini takar, herkes piknik yapar. Geleneksel lezzetler: sima (bal şarabı) ve munkki (çörek). "Hyvää vappua!"',
    },
    {
      date: fmt(addDays(easter, 39)),
      name: 'Helatorstai',
      nameEn: 'Ascension Day',
      nameTr: 'Yükseliş Günü',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'İsa\'nın göğe yükselişini simgeleyen Hristiyan bayramı.',
    },
    {
      date: fmt(addDays(easter, 49)),
      name: 'Helluntaipäivä',
      nameEn: 'Whit Sunday / Pentecost',
      nameTr: 'Hamsin Yortusu',
      isBankHoliday: true,
      isFlagDay: false,
      category: 'bankholiday',
      descriptionTr: 'Pentikost, Kutsal Ruh\'un inişini simgeler.',
    },
    {
      date: fmt(midsummer),
      name: 'Juhannuspäivä',
      nameEn: 'Midsummer Day',
      nameTr: 'Yaz Ortası Günü (Juhannus)',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Finlandiya\'nın Noel\'den sonraki en büyük bayramı! Şehirler boşalır, herkes göl kenarı yazlıklarına (mökki) gider. Şenlik ateşleri (kokko) yakılır, sauna yapılır.',
    },
    {
      date: fmt(saints),
      name: 'Pyhäinpäivä',
      nameEn: "All Saints' Day",
      nameTr: 'Azizler Günü',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Vefat edenleri anma günü. Mezarlıklar mumlarla aydınlatılır, aileler bir araya gelir.',
    },
    {
      date: `${year}-12-06`,
      name: 'Itsenäisyyspäivä',
      nameEn: 'Independence Day',
      nameTr: 'Bağımsızlık Günü',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Finlandiya\'nın 1917\'de bağımsızlığını kazandığı gün. Cumhurbaşkanlığı balosu tüm ülkede TV\'den izlenir. Mavi-beyaz bayraklar her yerde. "Hyvää itsenäisyyspäivää!"',
    },
    {
      date: `${year}-12-25`,
      name: 'Joulupäivä',
      nameEn: 'Christmas Day',
      nameTr: 'Noel Günü',
      isBankHoliday: true,
      isFlagDay: true,
      category: 'bankholiday',
      descriptionTr: 'Noel\'in birinci günü. Aile yemekleri, hediyeler ve sauna. "Hyvää joulua!"',
    },
    {
      date: `${year}-12-26`,
      name: 'Tapaninpäivä',
      nameEn: "St. Stephen's Day",
      nameTr: 'Tapanin Günü',
      isBankHoliday: true,
      isFlagDay: false,
      category: 'bankholiday',
      descriptionTr: 'Noel\'in ikinci resmi tatil günü. Aziz Stefan\'ı anma.',
    },

    // ── TANINMIŞ GÜNLER / observed ────────────────────────────────────────────
    {
      date: fmt(addDays(midsummer, -1)),
      name: 'Juhannusaatto',
      nameEn: 'Midsummer Eve',
      nameTr: 'Yaz Ortası Arifesi',
      isBankHoliday: false,
      isFlagDay: false,
      category: 'observed',
      descriptionTr: 'Juhannus arifesi. Akşam göl kıyılarında büyük ateşler (kokko) yakılır, geleneksel sauna yapılır.',
    },
    {
      date: `${year}-12-24`,
      name: 'Jouluaatto',
      nameEn: 'Christmas Eve',
      nameTr: 'Noel Arifesi',
      isBankHoliday: false,
      isFlagDay: false,
      category: 'observed',
      descriptionTr: 'Fin Noel kutlamalarının kalbi! Joulupukki (Noel Baba) hediyelerini getirir. Geleneksel yemek: joulukinkku (Noel jambonu) ve joulutorttu (erik reçelli kurabie).',
    },

    // ── BAYRAK & KÜLTÜR GÜNLERİ / flagday ────────────────────────────────────
    {
      date: `${year}-02-05`,
      name: 'Runebergin päivä',
      nameEn: 'Runeberg Day',
      nameTr: 'Runeberg Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fin ulusal şairi J.L. Runeberg\'in doğum günü. Geleneksel Runeberg turtaları (runebergintorttu) — ahududu reçelli, rummlu küçük kek — hazırlanır ve yenir.',
    },
    {
      date: `${year}-02-28`,
      name: 'Kalevalan päivä',
      nameEn: 'Kalevala Day',
      nameTr: 'Kalevala Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fin ulusal destanı Kalevala\'nın ilk kez yayınlandığı gün (1835). Fin kültürü, kimliği ve sanatının kutlandığı gün.',
    },
    {
      date: `${year}-03-19`,
      name: 'Minna Canthin päivä',
      nameEn: 'Minna Canth Day',
      nameTr: 'Minna Canth Günü (Eşitlik Günü)',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fin yazar ve sosyal aktivist Minna Canth\'ı anma. Eşitlik ve kadın hakları temalı gün.',
    },
    {
      date: `${year}-04-09`,
      name: 'Mikael Agricolan päivä',
      nameEn: 'Finnish Language Day',
      nameTr: 'Fince Dil Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fince yazı dilinin babası Mikael Agricola\'yı anma. Fin dili ve edebiyatının kutlandığı gün.',
    },
    {
      date: fmt(mothersDay),
      name: 'Äitienpäivä',
      nameEn: "Mother's Day",
      nameTr: 'Anneler Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Anneleri onurlandırma günü. Çiçekler, kartlar ve özel kahvaltılar geleneği. "Hyvää äitienpäivää!"',
    },
    {
      date: `${year}-05-12`,
      name: 'J.V. Snellmanin päivä',
      nameEn: 'J.V. Snellman Day',
      nameTr: 'Finlandiyalılık Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fin ulusal kimliğinin mimarı J.V. Snellman\'ı anma. Fin kimliği ve kültürünün kutlandığı gün.',
    },
    {
      date: `${year}-06-04`,
      name: 'Puolustusvoimain lippujuhlan päivä',
      nameEn: "Defence Forces' Flag Day",
      nameTr: 'Savunma Kuvvetleri Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fin Savunma Kuvvetleri\'ni onurlandırma günü. Askeri geçit törenleri yapılır.',
    },
    {
      date: `${year}-07-06`,
      name: 'Eino Leinon päivä',
      nameEn: 'Eino Leino Day',
      nameTr: 'Eino Leino Günü (Şiir & Yaz Günü)',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Fin şairi Eino Leino\'yu anma. Yaz ve şiir temalı kutlama.',
    },
    {
      date: `${year}-10-01`,
      name: 'Miina Sillanpään päivä',
      nameEn: 'Miina Sillanpää Day',
      nameTr: 'Miina Sillanpää Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Finlandiya\'nın ilk kadın bakanı Miina Sillanpää\'yı anma. Sivil katılım ve eşitlik temalı gün.',
    },
    {
      date: fmt(fathersDay),
      name: 'Isänpäivä',
      nameEn: "Father's Day",
      nameTr: 'Babalar Günü',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Babaları onurlandırma günü. Hediyeler ve özel aile yemekleri geleneği. "Hyvää isänpäivää!"',
    },
    {
      date: `${year}-12-08`,
      name: 'Jean Sibeliuksen päivä',
      nameEn: 'Jean Sibelius Day',
      nameTr: 'Jean Sibelius Günü (Fin Müziği Günü)',
      isBankHoliday: false,
      isFlagDay: true,
      category: 'flagday',
      descriptionTr: 'Dünyaca ünlü Fin besteci Jean Sibelius\'u anma. Finlandia senfonisi akla gelir. Fin müziği ve sanatının kutlandığı gün.',
    },
  ]
  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

/** Belirli bir tarih için tatil/bayrak günü döndürür, yoksa null */
export function getHolidayForDate(date: Date): FinnishHoliday | null {
  const dateStr = date.toISOString().split('T')[0]
  const year    = date.getFullYear()
  return getFinnishHolidays(year).find((h) => h.date === dateStr) ?? null
}
