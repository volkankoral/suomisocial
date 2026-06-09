'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  features: string[]
  is_active: boolean
  is_featured: boolean
  sort_order: number
  stripe_price_id_monthly?: string | null
  stripe_price_id_yearly?: string | null
}

export function PlanCard({ plan }: { plan: Plan }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: plan.name,
    price_monthly: plan.price_monthly,
    price_yearly: plan.price_yearly ?? '',
    is_active: plan.is_active,
    is_featured: plan.is_featured,
    stripe_price_id_monthly: plan.stripe_price_id_monthly ?? '',
    stripe_price_id_yearly:  plan.stripe_price_id_yearly  ?? '',
  })

  async function save() {
    setLoading(true)
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price_yearly: form.price_yearly === '' ? null : Number(form.price_yearly),
        stripe_price_id_monthly: form.stripe_price_id_monthly || null,
        stripe_price_id_yearly:  form.stripe_price_id_yearly  || null,
      }),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  async function toggleActive() {
    setLoading(true)
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !plan.is_active }),
    })
    setLoading(false)
    router.refresh()
  }

  const hasStripe = !!(plan.stripe_price_id_monthly || plan.stripe_price_id_yearly)

  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${plan.is_featured ? 'border-primary/40' : 'border-white/8'}`}>
      {plan.is_featured && (
        <div className="h-1 bg-gradient-to-r from-sky-500 to-primary" />
      )}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            {editing ? (
              <input
                className="text-lg font-bold bg-white/8 border border-white/15 rounded-lg px-2 py-1 w-full text-foreground"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            ) : (
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{plan.slug}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {plan.is_featured && (
              <span className="text-[10px] bg-primary/15 text-sky-300 border border-primary/25 px-2 py-0.5 rounded-full font-medium">
                ⭐ Öne Çıkan
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              plan.is_active
                ? 'bg-green-500/15 text-green-400 border-green-500/20'
                : 'bg-white/8 text-muted-foreground border-white/10'
            }`}>
              {plan.is_active ? 'Aktif' : 'Pasif'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              hasStripe
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
                : 'bg-white/5 text-zinc-600 border-white/8'
            }`}>
              {hasStripe ? '💳 Stripe ✓' : '💳 Stripe —'}
            </span>
          </div>
        </div>

        {/* Fiyat */}
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Aylık Fiyat (€)</p>
            {editing ? (
              <input
                type="number"
                step="0.01"
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-foreground text-sm"
                value={form.price_monthly}
                onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) }))}
              />
            ) : (
              <p className="text-2xl font-bold text-foreground">€{plan.price_monthly.toFixed(2)}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Yıllık Fiyat (€)</p>
            {editing ? (
              <input
                type="number"
                step="0.01"
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-foreground text-sm"
                value={form.price_yearly}
                onChange={e => setForm(f => ({ ...f, price_yearly: e.target.value }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {plan.price_yearly ? `€${plan.price_yearly.toFixed(2)}/yıl` : '—'}
              </p>
            )}
          </div>
        </div>

        {/* Stripe Price IDs */}
        {editing && (
          <div className="space-y-2 border-t border-white/8 pt-3">
            <p className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">Stripe Price IDs</p>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Aylık Price ID (price_xxx…)</p>
              <input
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-foreground text-xs font-mono"
                placeholder="price_..."
                value={form.stripe_price_id_monthly}
                onChange={e => setForm(f => ({ ...f, stripe_price_id_monthly: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Yıllık Price ID (price_xxx…)</p>
              <input
                className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-foreground text-xs font-mono"
                placeholder="price_..."
                value={form.stripe_price_id_yearly}
                onChange={e => setForm(f => ({ ...f, stripe_price_id_yearly: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Özellikler */}
        {!editing && plan.features && plan.features.length > 0 && (
          <ul className="space-y-1">
            {plan.features.map((f: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-green-400">✓</span> {f}
              </li>
            ))}
          </ul>
        )}

        {/* Aksiyonlar */}
        <div className="flex gap-2 pt-2 border-t border-white/8">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-40"
              >
                {loading ? 'Kaydediliyor…' : '💾 Kaydet'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-3 py-2 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground"
              >
                İptal
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 text-xs py-2 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25 transition-all"
              >
                ✏️ Düzenle
              </button>
              <button
                onClick={toggleActive}
                disabled={loading}
                className={`text-xs px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-40 ${
                  plan.is_active
                    ? 'bg-red-900/30 text-red-300 hover:opacity-80'
                    : 'bg-green-900/30 text-green-300 hover:opacity-80'
                }`}
              >
                {plan.is_active ? 'Pasifleştir' : 'Aktifleştir'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
