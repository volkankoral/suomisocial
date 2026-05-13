'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Plan { id: string; name: string }

interface Props {
  orgId: string
  currentPlanId?: string
  plans: Plan[]
}

export function UserActions({ orgId, currentPlanId, plans }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId ?? '')
  const [note, setNote] = useState('')

  async function assignPlan() {
    if (!selectedPlan) return
    setLoading(true)
    await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, planId: selectedPlan, note, isManual: true }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  async function cancelSub() {
    if (!confirm('Bu organizasyonun aboneliğini iptal etmek istiyor musun?')) return
    setLoading(true)
    await fetch('/api/admin/subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 rounded-lg border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/25 transition-all"
      >
        ⚙️ Yönet
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-64 rounded-xl border border-white/15 bg-zinc-900 shadow-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Plan Ata (Manuel)</p>

          <select
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
            value={selectedPlan}
            onChange={e => setSelectedPlan(e.target.value)}
          >
            <option value="">Plan seç</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none"
            placeholder="Not (opsiyonel)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              onClick={assignPlan}
              disabled={loading || !selectedPlan}
              className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'Atanıyor…' : '✓ Ata'}
            </button>
            <button
              onClick={cancelSub}
              disabled={loading}
              className="text-xs px-3 py-2 rounded-lg bg-red-900/40 text-red-300 hover:opacity-80 disabled:opacity-40"
            >
              İptal
            </button>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Kapat
          </button>
        </div>
      )}
    </div>
  )
}
