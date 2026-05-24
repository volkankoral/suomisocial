'use client'

import { OVERLAY_TEMPLATES } from './overlayTemplates'
import { ImageOverlayPreview } from './ImageOverlayPreview'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
  imageUrl?: string | null
  mainText: string
  subText?: string
}

export function TextTemplatePicker({ selectedId, onSelect, imageUrl, mainText, subText }: Props) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        🎨 Metin Şablonu
        <span className="text-[10px] text-muted-foreground/40 ml-1">— görsele metin overlay ekle</span>
      </label>

      <div className="grid grid-cols-4 gap-2">
        {OVERLAY_TEMPLATES.map(tpl => {
          const isSelected = selectedId === tpl.id
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={`
                group relative rounded-xl overflow-hidden border-2 transition-all
                ${isSelected
                  ? 'border-primary shadow-[0_0_0_1px] shadow-primary/30'
                  : 'border-white/10 hover:border-white/25'
                }
              `}
            >
              {/* Mini önizleme */}
              <div className="aspect-square w-full">
                {tpl.id === 'none' ? (
                  /* Boş şablon — sade görsel */
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl opacity-30">🖼</span>
                    )}
                  </div>
                ) : (
                  <ImageOverlayPreview
                    imageUrl={imageUrl}
                    templateId={tpl.id}
                    mainText={mainText}
                    subText={subText}
                    className="w-full h-full"
                  />
                )}
              </div>

              {/* Etiket */}
              <div className={`
                absolute bottom-0 inset-x-0 text-[9px] font-medium text-center py-0.5 leading-none
                ${isSelected ? 'bg-primary text-white' : 'bg-black/60 text-white/70'}
              `}>
                {tpl.label}
              </div>

              {/* Seçili işareti */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-white font-bold shadow">
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Seçili şablon için metin düzenleme */}
      {selectedId !== 'none' && (
        <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
          Metni aşağıdaki alandan düzenleyebilirsin
        </p>
      )}
    </div>
  )
}
