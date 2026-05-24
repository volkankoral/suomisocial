'use client'

import { getTemplate } from './overlayTemplates'

interface Props {
  imageUrl: string | null | undefined
  templateId: string | null | undefined
  /** Ana metin (işletme adı veya özel yazı) */
  mainText: string
  /** Alt metin (etiket / rutin adı) */
  subText?: string
  className?: string
}

/**
 * Görsel + CSS overlay şablonunu birlikte render eder.
 * Sunucu işlemi yok — saf CSS/Tailwind.
 */
export function ImageOverlayPreview({ imageUrl, templateId, mainText, subText, className = '' }: Props) {
  const tpl = getTemplate(templateId)

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={mainText}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-white/4 flex items-center justify-center text-3xl">🖼</div>
      )}

      {/* Overlay şablonu */}
      {tpl.id !== 'none' && (
        <div className={tpl.wrapperClass}>
          <span className={tpl.textClass} style={{ fontSize: 'clamp(10px, 3.5cqw, 28px)' }}>
            {mainText}
          </span>
          {subText && tpl.subTextClass && (
            <span className={tpl.subTextClass} style={{ fontSize: 'clamp(8px, 2.2cqw, 16px)' }}>
              {subText}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
