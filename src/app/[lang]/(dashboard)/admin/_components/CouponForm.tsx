'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Plan { id: string; name: string }

export function CouponForm({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    applies_to_plan: '',
    applies_to_email: '',
    max_uses: '',
    expires_at: '',
  })

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.discount_value) {
      setError('Kupon kodu ve indirim değeri zorunlu')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          discount_value: parseFloat(form.discount_value),
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
          applies_to_plan: form.applies_to_plan || null,
          applies_to_email: form.applies_to_email || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Hata')
      setSuccess(`✅ Kupon oluşturuldu: ${form.code}`)
      setForm({ code: '', description: '', discount_type: 'percent', discount_value: '', applies_to_plan: '', applies_to_email: '', max_uses: '', expires_at: '' })
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
        {/* Kupon Kodu */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Kupon Kodu *</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm font-mono uppercase placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="INDIRIM20"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
            <button
              type="button"
              onClick={generateCode}
              className="text-xs px-3 py-2 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground transition-all whitespace-nowrap"
            >
              🎲 Rastgele
            </button>
          </div>
        </div>

        {/* İndirim türü + değer */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">İndirim *</label>
          <div className="flex gap-2">
            <select
              className="bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none"
              value={form.discount_type}
              onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
            >
              <option value="percent">% Yüzde</option>
              <option value="fixed">€ Sabit</option>
            </select>
            <input
              type="number"
              step="0.01"
              className="flex-1 bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder={form.discount_type === 'percent' ? '20' : '10.00'}
              value={form.discount_value}
              onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
            />
          </div>
        </div>

        {/* Belirli plana */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Sadece Bu Plana (opsiyonel)</label>
          <select
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none"
            value={form.applies_to_plan}
            onChange={e => setForm(f => ({ ...f, applies_to_plan: e.target.value }))}
          >
            <option value="">Tüm planlar</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Belirli e-postaya */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Sadece Bu E-posta (opsiyonel)</label>
          <input
            type="email"
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="musteri@email.com"
            value={form.applies_to_email}
            onChange={e => setForm(f => ({ ...f, applies_to_email: e.target.value }))}
          />
        </div>

        {/* Kullanım limiti */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Maks. Kullanım (boş = sınırsız)</label>
          <input
            type="number"
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            placeholder="100"
            value={form.max_uses}
            onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
          />
        </div>

        {/* Son geçerlilik */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Son Geçerlilik (boş = süresiz)</label>
          <input
            type="date"
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary/50"
            value={form.expires_at}
            onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
          />
        </div>
      </div>

      {/* Açıklama */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">İç Not (kullanıcıya görünmez)</label>
        <input
          className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2.5 text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50"
          placeholder="örn: Ahmet'e özel ilk ay indirimi"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? 'Oluşturuluyor…' : '🎟️ Kupon Oluştur'}
      </button>
    </form>
  )
}
