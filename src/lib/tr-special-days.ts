/**
 * Türkiye özel günleri — küçük işletmeler için sosyal medya postu üretilecek günler.
 *
 * SpecialDay arayüzü fi-special-days.ts ile ortaktır. `name_fi` / `context_fi`
 * alanları "birincil yerel dil" anlamında kullanılır — Türkiye bölgesinde Türkçe.
 *
 * Tarih ifadeleri (resolveDate destekler):
 *   'MM-DD'           sabit gün           örn. '10-29' = Cumhuriyet Bayramı
 *   'nth:M:W:N'       ayın N. haftagünü   örn. 'nth:6:0:3' = Haziran 3. Pazar
 *   'mothers'         Mayıs 2. Pazar
 *   'YYYY-MM-DD'      yıla bağlı sabit    (dini bayramlar — ileride eklenecek)
 */

import type { SpecialDay, RoutinePost } from './fi-special-days'

export const TR_SPECIAL_DAYS: SpecialDay[] = [
  // === MAJOR — En büyük günler ===
  {
    id: 'tr-yilbasi',
    date: '01-01',
    name_fi: 'Yılbaşı',
    name_tr: 'Yılbaşı',
    tier: 'major',
    context_fi: 'Yeni yıl başlıyor. Müşterilere mutlu, bereketli bir yıl dilenir. Sıcak, umutlu, kutlama havası.',
    visual_hint: 'new year celebration, fireworks, sparkles, gold and red, festive table, midnight',
  },
  {
    id: 'tr-cocuk-bayrami',
    date: '04-23',
    name_fi: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',
    name_tr: '23 Nisan Çocuk Bayramı',
    tier: 'major',
    context_fi: 'Atatürk\'ün çocuklara armağan ettiği bayram. Neşeli, renkli, çocuk dostu ton. Bayrak ve çocuk teması.',
    visual_hint: 'children festival, colorful balloons, Turkish flags, kids celebrating, joyful bright atmosphere',
  },
  {
    id: 'tr-genclik-bayrami',
    date: '05-19',
    name_fi: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
    name_tr: '19 Mayıs Gençlik ve Spor Bayramı',
    tier: 'major',
    context_fi: 'Atatürk\'ün Samsun\'a çıkışı ve gençliğe armağanı. Enerjik, sportif, vatansever ton.',
    visual_hint: 'youth sports festival, Turkish flags, energetic crowd, athletic celebration, blue sky',
  },
  {
    id: 'tr-zafer-bayrami',
    date: '08-30',
    name_fi: '30 Ağustos Zafer Bayramı',
    name_tr: '30 Ağustos Zafer Bayramı',
    tier: 'major',
    context_fi: 'Büyük Taarruz zaferi. Gururlu, vatansever, ciddi ama coşkulu ton.',
    visual_hint: 'victory celebration, Turkish flags, proud patriotic atmosphere, monument, golden light',
  },
  {
    id: 'tr-cumhuriyet-bayrami',
    date: '10-29',
    name_fi: '29 Ekim Cumhuriyet Bayramı',
    name_tr: '29 Ekim Cumhuriyet Bayramı',
    tier: 'major',
    context_fi: 'Türkiye Cumhuriyeti\'nin kuruluşu. En büyük ulusal bayram. Gururlu, coşkulu, kırmızı-beyaz tema.',
    visual_hint: 'republic day celebration, abundant Turkish flags, red and white, fireworks, festive crowd',
  },

  // === MEDIUM — Orta önemli günler ===
  {
    id: 'tr-sevgililer-gunu',
    date: '02-14',
    name_fi: 'Sevgililer Günü',
    name_tr: 'Sevgililer Günü',
    tier: 'medium',
    context_fi: 'Sevgililer Günü. Romantik, sıcak, kırmızı tema. Çiftlere özel kampanya fırsatı.',
    visual_hint: 'valentines day, red roses, hearts, romantic warm candlelight, couple dinner setting',
  },
  {
    id: 'tr-kadinlar-gunu',
    date: '03-08',
    name_fi: 'Dünya Kadınlar Günü',
    name_tr: '8 Mart Dünya Kadınlar Günü',
    tier: 'medium',
    context_fi: 'Dünya Kadınlar Günü. Saygılı, güçlü, kadınları onurlandıran ton. Mor tema.',
    visual_hint: 'international womens day, purple flowers, elegant strong feminine, soft light, mimosa',
  },
  {
    id: 'tr-canakkale',
    date: '03-18',
    name_fi: 'Çanakkale Zaferi',
    name_tr: '18 Mart Çanakkale Zaferi',
    tier: 'medium',
    context_fi: 'Çanakkale Deniz Zaferi ve Şehitleri Anma Günü. Saygılı, vakur, anlamlı ton.',
    visual_hint: 'memorial day, Turkish flag, respectful solemn atmosphere, carnations, monument',
  },
  {
    id: 'tr-anneler-gunu',
    date: 'mothers',
    name_fi: 'Anneler Günü',
    name_tr: 'Anneler Günü',
    tier: 'medium',
    context_fi: 'Anneler Günü (Mayıs ikinci Pazar). Sıcak, sevgi dolu, minnettar ton. Birlikte vakit geçirme.',
    visual_hint: 'mothers day, roses, warm family table, soft pink flowers, tender warm light',
  },
  {
    id: 'tr-babalar-gunu',
    date: 'nth:6:0:3',
    name_fi: 'Babalar Günü',
    name_tr: 'Babalar Günü',
    tier: 'medium',
    context_fi: 'Babalar Günü (Haziran üçüncü Pazar). Sıcak, saygılı, aile teması.',
    visual_hint: 'fathers day, warm family moment, gift, cozy table, soft natural light',
  },
  {
    id: 'tr-emek-gunu',
    date: '05-01',
    name_fi: 'Emek ve Dayanışma Günü',
    name_tr: '1 Mayıs Emek ve Dayanışma Günü',
    tier: 'medium',
    context_fi: 'İşçi Bayramı. Dayanışma, emek, bahar teması. Olumlu ve kapsayıcı ton.',
    visual_hint: 'spring solidarity, fresh flowers, bright daylight, hopeful community atmosphere',
  },
  {
    id: 'tr-demokrasi-gunu',
    date: '07-15',
    name_fi: 'Demokrasi ve Millî Birlik Günü',
    name_tr: '15 Temmuz Demokrasi ve Millî Birlik Günü',
    tier: 'medium',
    context_fi: 'Demokrasi ve Millî Birlik Günü. Saygılı, birlik vurgulu ton.',
    visual_hint: 'national unity, Turkish flag, respectful patriotic atmosphere, evening light',
  },
  {
    id: 'tr-ataturk-anma',
    date: '11-10',
    name_fi: 'Atatürk\'ü Anma Günü',
    name_tr: '10 Kasım Atatürk\'ü Anma Günü',
    tier: 'medium',
    context_fi: '10 Kasım, Atatürk\'ü saygıyla anma günü. Vakur, saygılı, sade ton. Abartısız.',
    visual_hint: 'memorial, respectful solemn atmosphere, Turkish flag at half-mast, monochrome elegant',
  },
  {
    id: 'tr-ogretmenler-gunu',
    date: '11-24',
    name_fi: 'Öğretmenler Günü',
    name_tr: '24 Kasım Öğretmenler Günü',
    tier: 'medium',
    context_fi: 'Öğretmenler Günü. Minnettar, saygılı, sıcak ton. Öğretmenlere teşekkür.',
    visual_hint: 'teachers day, books, red carnation, warm classroom light, grateful atmosphere',
  },
  {
    id: 'tr-nevruz',
    date: '03-21',
    name_fi: 'Nevruz',
    name_tr: 'Nevruz Bayramı',
    tier: 'medium',
    context_fi: 'Nevruz — baharın gelişi, doğanın uyanışı. Canlı, yeşil, yeni başlangıç teması.',
    visual_hint: 'spring equinox, green sprouts, blooming flowers, fresh sunny nature, renewal',
  },

  // === BONUS — İş koluna özel / fırsat günleri ===
  {
    id: 'tr-yeni-yil-sezonu',
    date: '12-01',
    name_fi: 'Yılbaşı Sezonu Başlıyor',
    name_tr: 'Yılbaşı Sezonu',
    tier: 'bonus',
    context_fi: 'Aralık — yılbaşı alışveriş ve kutlama sezonu. İşletmeler için yoğun dönem.',
    visual_hint: 'festive december season, lights, gifts, cozy winter celebration, warm decorations',
  },
  {
    id: 'tr-okula-donus',
    date: '09-09',
    name_fi: 'Okula Dönüş',
    name_tr: 'Okula Dönüş Dönemi',
    tier: 'bonus',
    context_fi: 'Eylül — okullar açılıyor. Aileler için hareketli dönem; kampanya fırsatı.',
    visual_hint: 'back to school, backpacks, notebooks, fresh autumn morning, bright cheerful',
  },
  {
    id: 'tr-kara-cuma',
    date: '11-28',
    name_fi: 'Kara Cuma (Black Friday)',
    name_tr: 'Kara Cuma',
    tier: 'bonus',
    context_fi: 'Kasım sonu büyük indirim dönemi. Net indirim mesajı, aciliyet hissi.',
    visual_hint: 'black friday sale, bold discount energy, shopping bags, dark background with bright accents',
  },
  {
    id: 'tr-dunya-kahve-gunu',
    date: '10-01',
    name_fi: 'Dünya Kahve Günü',
    name_tr: 'Dünya Kahve Günü',
    tier: 'bonus',
    context_fi: 'Dünya Kahve Günü. Kafeler için ideal. Sıcak, keyifli kahve anı.',
    visual_hint: 'world coffee day, latte art, cozy cafe, steam rising, warm morning light',
    industries: ['cafe', 'restaurant'],
  },
  {
    id: 'tr-dunya-pizza-gunu',
    date: '02-09',
    name_fi: 'Dünya Pizza Günü',
    name_tr: 'Dünya Pizza Günü',
    tier: 'bonus',
    context_fi: 'Dünya Pizza Günü. Pizzacılar için birebir. İştah açıcı, neşeli ton.',
    visual_hint: 'world pizza day, fresh hot pizza, melted cheese, rustic wooden table, appetizing',
    industries: ['restaurant', 'pizzeria'],
  },
]

export const TR_WEEKLY_ROUTINES: RoutinePost[] = [
  {
    id: 'tr-iyi-haftasonlari',
    weekday: 5,                  // Cuma
    preferred_time: '17:00',
    name_fi: 'İyi Hafta Sonları',
    name_tr: 'İyi Hafta Sonları',
    context_fi: 'Cuma akşamı müşterilere hafta sonu selamı. Rahat, sıcak, keyifli ton.',
    visual_hint: 'cozy weekend evening, warm lights, friends gathering, relaxed friday vibe',
  },
  {
    id: 'tr-haftaya-merhaba',
    weekday: 1,                  // Pazartesi
    preferred_time: '09:00',
    name_fi: 'Haftaya Merhaba',
    name_tr: 'Haftaya Merhaba',
    context_fi: 'Pazartesi sabahı enerjik bir hafta başlangıcı selamı. Motive edici, taze ton.',
    visual_hint: 'fresh monday morning, bright sunlight, energetic positive start, coffee',
  },
]
