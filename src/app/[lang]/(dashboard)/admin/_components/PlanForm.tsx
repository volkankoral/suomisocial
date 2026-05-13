'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PlanForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    features: '',
    is_featured: false,
  })

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price_monthly) {
      setError('Plan adı ve aylık fiyat zorunlu')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const features = form.features
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean)

      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price_monthly: parseFloat(form.price_monthly),
          price_yearly: form.price_yearly ? parseFloat(form.price_yearly) : null,
          features,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Hata')
      setForm({ name: '', slug: '', description: '', price_monthly: '', price_yearly: '', features: '', is_featured: false })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/8 bg-card p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Plan Adı *</label>
          <input
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="örn: Starter"
            value={form.name}
            onChange={e => handleNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Slug (otomatik)</label>
          <input
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2.5 text-muted-foreground text-sm"
            value={form.slug}
            readOnly
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Aylık Fiyat (€) *</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="29.00"
            value={form.price_monthly}
            onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Yıllık Fiyat (€)</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="290.00 (boş bırakılabilir)"
            value={form.price_yearly}
            onChange={e => setForm(f => ({ ...f, price_yearly: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Açıklama</label>
        <input
          className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="Kısa plan açıklaması"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">
          Özellikler (her satıra bir tane)
        </label>
        <textarea
          rows={5}
          className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          placeholder={"1 sosyal medya hesabı\nAyda 20 AI içerik\nEmail destek"}
          value={form.features}
          onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded"
          checked={form.is_featured}
          onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
        />
        <span className="text-sm text-foreground">⭐ Öne çıkan plan ("En Popüler" badge)</span>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? 'Oluşturuluyor…' : '+ Plan Oluştur'}
      </button>
    </form>
  )
}
