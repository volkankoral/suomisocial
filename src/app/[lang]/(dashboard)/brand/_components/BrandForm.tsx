'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BrandData {
  id?: string
  business_name?: string
  description?: string | null
  tone?: string | null
  primary_color?: string | null
  products?: string[] | null
  languages?: string[] | null
}

interface Props {
  orgId: string
  brand: BrandData | null
}

const TONE_OPTIONS = [
  { value: 'samimi ve sıcak', label: 'Samimi & Sıcak' },
  { value: 'profesyonel', label: 'Profesyonel' },
  { value: 'eğlenceli ve renkli', label: 'Eğlenceli & Renkli' },
  { value: 'minimalist', label: 'Minimalist' },
]

export function BrandForm({ orgId, brand }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    business_name: brand?.business_name ?? '',
    description: brand?.description ?? '',
    tone: brand?.tone ?? 'samimi ve sıcak',
    primary_color: brand?.primary_color ?? '#e63946',
    products: Array.isArray(brand?.products) ? (brand.products as string[]).join(', ') : '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    await fetch('/api/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: form.business_name,
        description: form.description,
        tone: form.tone,
        primary_color: form.primary_color,
        products: form.products.split(',').map((p) => p.trim()).filter(Boolean),
      }),
    })

    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-6">
      {/* İşletme adı */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          İşletme Adı
        </label>
        <input
          type="text"
          required
          value={form.business_name}
          onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          placeholder="Golden Pizzeria"
        />
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Açıklama
          <span className="text-zinc-400 font-normal ml-1">(AI bu metni kullanır)</span>
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
          placeholder="Finlandiya'da otantik İtalyan pizza ve makarna sunan aile restoranı..."
        />
      </div>

      {/* Ton */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          İçerik Tonu
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                form.tone === opt.value
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
              }`}
            >
              <input
                type="radio"
                name="tone"
                value={opt.value}
                checked={form.tone === opt.value}
                onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Ürünler */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Ürünler / Menü
          <span className="text-zinc-400 font-normal ml-1">(virgülle ayır)</span>
        </label>
        <input
          type="text"
          value={form.products}
          onChange={(e) => setForm((f) => ({ ...f, products: e.target.value }))}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          placeholder="pizza, pasta, risotto, tiramisu"
        />
      </div>

      {/* Ana renk */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Ana Renk
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.primary_color}
            onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
            className="h-10 w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer"
          />
          <span className="text-sm font-mono text-zinc-500">{form.primary_color}</span>
        </div>
      </div>

      {/* Kaydet */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saved && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Kaydedildi</p>
        )}
      </div>
    </form>
  )
}
