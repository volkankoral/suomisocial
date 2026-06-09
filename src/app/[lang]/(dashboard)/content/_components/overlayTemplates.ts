/**
 * Görsel üzerine CSS overlay şablon tanımları.
 * Her şablon saf Tailwind/CSS — sunucu işlemi gerektirmez.
 * `id` → DB'de overlay_template alanına kaydedilir.
 */

export interface OverlayTemplate {
  id: string
  label: string
  /** Küçük thumbnail önizleme için arka plan rengi */
  previewBg: string
  /** Tailwind class'ları — görsel container'ına (relative) göre konumlandırılır */
  wrapperClass: string
  textClass: string
  subTextClass?: string
}

export const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: 'none',
    label: 'Yok',
    previewBg: 'bg-white/5',
    wrapperClass: 'hidden',
    textClass: '',
  },
  {
    id: 'bottom_gradient',
    label: 'Alt Bant',
    previewBg: 'bg-gradient-to-t from-black/80 to-transparent',
    wrapperClass:
      'absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-[6%] px-[5%] bg-gradient-to-t from-black/80 via-black/30 to-transparent h-[42%]',
    textClass:
      'text-white font-bold text-center leading-tight drop-shadow-lg',
    subTextClass: 'text-white/70 text-[0.65em] tracking-widest uppercase mt-0.5',
  },
  {
    id: 'top_bar',
    label: 'Üst Şerit',
    previewBg: 'bg-primary',
    wrapperClass:
      'absolute inset-x-0 top-0 bg-primary py-[3%] px-[5%] flex flex-col items-center justify-center',
    textClass:
      'text-white font-black uppercase tracking-widest text-center leading-none',
    subTextClass: 'text-white/80 text-[0.6em] tracking-[0.2em] mt-0.5',
  },
  {
    id: 'center_badge',
    label: 'Merkez',
    previewBg: 'bg-black/50',
    wrapperClass:
      'absolute inset-0 flex flex-col items-center justify-center px-[8%]',
    textClass:
      'text-white font-black text-center leading-tight bg-black/55 backdrop-blur-sm rounded-2xl px-[6%] py-[3%] border border-white/20 drop-shadow-xl',
    subTextClass: 'text-white/70 text-[0.6em] tracking-widest uppercase mt-1',
  },
  {
    id: 'corner_badge',
    label: 'Köşe Rozet',
    previewBg: 'bg-white',
    wrapperClass:
      'absolute top-[4%] left-[4%] bg-white rounded-2xl shadow-2xl px-[4%] py-[2.5%] max-w-[55%]',
    textClass:
      'text-black font-black uppercase tracking-wide leading-tight text-center',
    subTextClass: 'text-black/50 text-[0.6em] tracking-widest uppercase mt-0.5',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    previewBg: 'bg-transparent',
    wrapperClass:
      'absolute inset-x-0 bottom-0 pb-[4%] pr-[5%] flex flex-col items-end justify-end',
    textClass:
      'text-white/90 font-light tracking-[0.18em] uppercase text-right drop-shadow-md',
    subTextClass: 'text-white/50 text-[0.65em] tracking-[0.25em] mt-0.5 text-right',
  },
  {
    id: 'stamp',
    label: 'Damga',
    previewBg: 'bg-transparent',
    wrapperClass:
      'absolute top-[4%] right-[4%] w-[22%] aspect-square rounded-full border-[0.35em] border-white/90 flex flex-col items-center justify-center rotate-12 shadow-xl',
    textClass:
      'text-white font-black text-center uppercase leading-tight text-[0.6em] tracking-wider',
    subTextClass: 'text-white/70 text-[0.5em] tracking-widest text-center mt-0.5',
  },
]

export function getTemplate(id: string | null | undefined): OverlayTemplate {
  return OVERLAY_TEMPLATES.find(t => t.id === id) ?? OVERLAY_TEMPLATES[0]
}
