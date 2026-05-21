'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/useT'

interface Props {
  draftId: string
  captionFi: string
  captionTr: string
  hashtags: string[]
  imageUrl?: string | null
}

export function EditDraftModal({ draftId, captionFi, captionTr, hashtags, imageUrl }: Props) {
  const router = useRouter()
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen]               = useState(false)
  const [fi, setFi]                   = useState(captionFi)
  const [tr, setTr]                   = useState(captionTr)
  const [tags, setTags]               = useState(hashtags.join(', '))
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl ?? null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function openModal() {
    setFi(captionFi)
    setTr(captionTr)
    setTags(hashtags.join(', '))
    setCurrentImageUrl(imageUrl ?? null)
    setPreviewUrl(null)
    setError(null)
    setOpen(true)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setError(null)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', 'post-media')

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Yükleme hatası')
      }
      const { url } = await res.json()
      setCurrentImageUrl(url)
      setPreviewUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görsel yüklenemedi')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const parsedTags = tags
        .split(/[,\s#]+/)
        .map(h => h.trim().replace(/^#/, ''))
        .filter(Boolean)

      const body: Record<string, unknown> = {
        caption_fi: fi.trim(),
        caption_tr: tr.trim(),
        hashtags:   parsedTags,
      }
      if (currentImageUrl !== imageUrl) {
        body.image_url = currentImageUrl
      }

      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Kayıt hatası')
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const displayImage = previewUrl ?? currentImageUrl

  return (
    <>
      {/* Tetikleyici */}
      <button
        onClick={openModal}
        className="text-xs px-3 py-2 sm:py-1.5 rounded-lg font-medium border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/24 transition-colors"
      >
        ✏️ {t.common.change ?? 'Düzenle'}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => !saving && !uploading && setOpen(false)}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none"
            >
              <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col">

                {/* Başlık */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                  <h2 className="font-semibold text-foreground text-sm">✏️ Taslağı Düzenle</h2>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={saving || uploading}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* İçerik */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                  {/* Görsel */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      🖼 Görsel
                    </label>
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/4">
                      {displayImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayImage}
                          alt="Taslak görseli"
                          className={`w-full h-48 object-cover transition-opacity ${uploading ? 'opacity-50' : 'opacity-100'}`}
                        />
                      ) : (
                        <div className="w-full h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                          <span className="text-3xl">🖼</span>
                          <span className="text-xs">Görsel yok</span>
                        </div>
                      )}

                      {/* Upload overlay */}
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="flex flex-col items-center gap-2">
                            <span className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span className="text-xs text-white/70">Yükleniyor…</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Değiştir butonu */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={uploading || saving}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                      className="mt-2 w-full text-xs py-2 rounded-lg border border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {uploading ? (
                        <>
                          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Yükleniyor…
                        </>
                      ) : (
                        <>📁 Görseli Değiştir</>
                      )}
                    </button>
                    <p className="text-[10px] text-muted-foreground/40 mt-1 text-center">JPG, PNG veya WebP · Maks 50 MB</p>
                  </div>

                  {/* Fince Caption */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <span>🇫🇮</span> Fince Caption
                      <span className="ml-auto text-[10px] text-muted-foreground/60">{fi.length} / 2200</span>
                    </label>
                    <textarea
                      value={fi}
                      onChange={e => setFi(e.target.value)}
                      rows={5}
                      maxLength={2200}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-white/25 transition-colors leading-relaxed"
                      placeholder="Fince caption..."
                    />
                  </div>

                  {/* Türkçe Caption */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <span>🇹🇷</span> Türkçe Çeviri
                      <span className="text-[10px] text-muted-foreground/40 ml-1">(referans)</span>
                    </label>
                    <textarea
                      value={tr}
                      onChange={e => setTr(e.target.value)}
                      rows={3}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-white/25 transition-colors leading-relaxed"
                      placeholder="Türkçe çeviri..."
                    />
                  </div>

                  {/* Hashtag'ler */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      # Hashtag&apos;ler
                      <span className="text-[10px] text-muted-foreground/40 ml-1">(virgül veya boşlukla ayır)</span>
                    </label>
                    <input
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      className="w-full bg-white/4 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/25 transition-colors"
                      placeholder="suomi, helsinki, markkinointi..."
                    />
                    {/* Önizleme */}
                    {tags.trim() && (
                      <p className="text-xs text-primary/70 mt-2 leading-relaxed">
                        {tags.split(/[,\s#]+/).filter(Boolean).map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                      </p>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                </div>

                {/* Butonlar */}
                <div className="px-5 pb-5 pt-3 flex gap-2.5 shrink-0 border-t border-white/8">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={saving || uploading}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors disabled:opacity-40"
                  >
                    İptal
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || uploading || !fi.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Kaydediliyor…
                      </>
                    ) : (
                      '✓ Kaydet'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
