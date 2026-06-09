'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentPlan {
  id: string
  status: 'planning' | 'ready' | 'done' | 'failed'
  week_start: string
  strategy_summary: string | null
  items_total: number
  items_approved: number
  error_message: string | null
  created_at: string
}

interface ContentDraft {
  id: string
  caption_fi: string | null
  caption_tr: string | null
  hashtags: string[] | null
  image_url: string | null
  special_day_label: string | null
  category: string | null
  scheduled_at: string | null
}

interface AgentItem {
  id: string
  scheduled_date: string
  rationale: string | null
  priority: number
  status: 'pending' | 'generating' | 'ready' | 'approved' | 'rejected'
  created_at: string
  content_drafts: ContentDraft | null
}

interface Props {
  lang: string
  isPro: boolean
  plan: AgentPlan | null
  items: AgentItem[]
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority, labels }: { priority: number; labels: [string, string, string] }) {
  const [high, med, low] = labels
  if (priority === 1) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-medium">⬆ {high}</span>
  if (priority === 2) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">➡ {med}</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">⬇ {low}</span>
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({ status, labels }: { status: AgentItem['status']; labels: Record<string, string> }) {
  const map: Record<string, string> = {
    pending:    'bg-white/10 text-muted-foreground',
    generating: 'bg-sky-500/15 text-sky-300',
    ready:      'bg-primary/15 text-sky-200',
    approved:   'bg-green-500/15 text-green-300',
    rejected:   'bg-red-500/15 text-red-300',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${map[status] ?? map.pending}`}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentPage({ lang, isPro, plan: initialPlan, items: initialItems }: Props) {
  const t      = useT()
  const ag     = t.agent
  const router = useRouter()

  const [plan,        setPlan]        = useState<AgentPlan | null>(initialPlan)
  const [items,       setItems]       = useState<AgentItem[]>(initialItems)
  const [imgErrors,   setImgErrors]   = useState<Record<string, boolean>>({})
  const [creating,    setCreating]    = useState(false)
  const [polling,     setPolling]     = useState(false)
  const [createErr,   setCreateErr]   = useState<string | null>(null)
  const [approving,   setApproving]   = useState<string | null>(null)
  const [rejecting,   setRejecting]   = useState<string | null>(null)
  const [approvingAll,setApprovingAll]= useState(false)

  const isPlanning = plan?.status === 'planning' || polling

  // Poll plan status every 4 seconds while planning
  const pollPlan = useCallback(async () => {
    try {
      const res  = await fetch('/api/agent/plan')
      const json = await res.json() as { plan: AgentPlan | null; items: AgentItem[] }
      setPlan(json.plan)
      setItems(json.items ?? [])
      if (json.plan?.status === 'ready' || json.plan?.status === 'done' || json.plan?.status === 'failed') {
        setPolling(false)
        router.refresh()
      }
    } catch {
      setPolling(false)
    }
  }, [router])

  useEffect(() => {
    if (!polling) return
    const id = setInterval(pollPlan, 4000)
    return () => clearInterval(id)
  }, [polling, pollPlan])

  // Also start polling if plan is in 'planning' state on mount
  useEffect(() => {
    if (plan?.status === 'planning') {
      setPolling(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createPlan(force = false) {
    setCreating(true)
    setCreateErr(null)
    try {
      const res  = await fetch('/api/agent/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ force }),
      })
      const json = await res.json() as { planId?: string; error?: string }
      if (!res.ok) {
        setCreateErr(json.error ?? ag.genError)
        return
      }
      setPolling(true)
      await pollPlan()
    } catch {
      setCreateErr(ag.genError)
    } finally {
      setCreating(false)
    }
  }

  async function approveItem(itemId: string) {
    setApproving(itemId)
    try {
      await fetch('/api/agent/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'approve' }),
      })
      setItems(is => is.map(i => i.id === itemId ? { ...i, status: 'approved' } : i))
    } catch { /* silent */ } finally { setApproving(null) }
  }

  async function rejectItem(itemId: string) {
    setRejecting(itemId)
    try {
      await fetch('/api/agent/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action: 'reject' }),
      })
      setItems(is => is.map(i => i.id === itemId ? { ...i, status: 'rejected' } : i))
    } catch { /* silent */ } finally { setRejecting(null) }
  }

  async function approveAll() {
    setApprovingAll(true)
    try {
      await fetch('/api/agent/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all' }),
      })
      setItems(is => is.map(i => i.status === 'ready' ? { ...i, status: 'approved' } : i))
      setPlan(p => p ? { ...p, status: 'done', items_approved: p.items_total } : p)
    } catch { /* silent */ } finally { setApprovingAll(false) }
  }

  const readyCount    = items.filter(i => i.status === 'ready').length
  const approvedCount = items.filter(i => i.status === 'approved').length

  // Format week range label
  const weekLabel = (() => {
    if (!plan?.week_start) return null
    const start = new Date(plan.week_start + 'T00:00:00Z')
    const end   = new Date(start); end.setUTCDate(start.getUTCDate() + 6)
    const fmt   = (d: Date) => d.toLocaleDateString(
      lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB',
      { month: 'short', day: 'numeric' }
    )
    return `${fmt(start)} – ${fmt(end)}`
  })()

  const statusMap: Record<string, string> = {
    pending:    ag.statusPending,
    generating: ag.statusGenerating,
    ready:      ag.statusPending,
    approved:   ag.statusApproved,
    rejected:   ag.statusRejected,
  }

  return (
    <div className="max-w-4xl space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text">{ag.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ag.subtitle}</p>
        </div>

        {isPro && !isPlanning && (
          <button
            onClick={() => createPlan(!!plan)}
            disabled={creating}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {creating ? ag.creating : plan ? ag.recreatePlan : ag.createPlan}
          </button>
        )}
      </div>

      {/* ── Pro gate ── */}
      {!isPro && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-8 text-center space-y-3">
          <p className="text-4xl">🤖</p>
          <p className="font-semibold text-foreground text-lg">{ag.proRequired}</p>
          <p className="text-sm text-muted-foreground">{ag.proRequiredDesc}</p>
          <a
            href={`/${lang}/billing`}
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {ag.upgradeBtn}
          </a>
        </div>
      )}

      {/* ── Planning banner ── */}
      {isPro && isPlanning && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/8 p-6 flex items-center gap-4">
          <div className="text-3xl animate-spin" style={{ animationDuration: '2s' }}>⚙️</div>
          <div>
            <p className="font-semibold text-foreground">{ag.statusPlanning}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{ag.creatingHint}</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {createErr && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">
          ❌ {createErr}
        </div>
      )}
      {plan?.status === 'failed' && plan.error_message && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">
          ❌ {ag.statusFailed}: {plan.error_message}
        </div>
      )}

      {/* ── No plan yet ── */}
      {isPro && !plan && !creating && !isPlanning && (
        <div className="rounded-2xl border border-white/8 bg-white/2 p-12 text-center space-y-3">
          <p className="text-5xl">🗓️</p>
          <p className="font-semibold text-foreground text-base">{ag.noPlan}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{ag.noPlanHint}</p>
          <button
            onClick={() => createPlan(false)}
            disabled={creating}
            className="mt-4 inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {creating ? ag.creating : ag.createPlan}
          </button>
        </div>
      )}

      {/* ── Plan exists ── */}
      {isPro && plan && plan.status !== 'planning' && (
        <>
          {/* Plan meta */}
          <div className="flex items-center gap-3 flex-wrap text-sm">
            {weekLabel && (
              <span className="px-3 py-1 rounded-full bg-white/6 border border-white/10 text-muted-foreground">
                📅 {ag.weekOf} <span className="text-foreground font-medium">{weekLabel}</span>
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-white/6 border border-white/10 text-muted-foreground">
              📦 {ag.totalItems} <span className="text-foreground font-medium">{plan.items_total}</span>
            </span>
            <span className={`px-3 py-1 rounded-full font-medium border ${
              plan.status === 'done'   ? 'bg-green-500/15 border-green-500/25 text-green-300' :
              plan.status === 'ready'  ? 'bg-primary/15 border-primary/25 text-sky-200' :
              plan.status === 'failed' ? 'bg-red-500/15 border-red-500/25 text-red-300' :
                                         'bg-white/8 border-white/10 text-muted-foreground'
            }`}>
              {plan.status === 'done'   ? ag.statusDone   :
               plan.status === 'ready'  ? ag.statusReady  :
               plan.status === 'failed' ? ag.statusFailed :
               ag.statusPlanning}
            </span>
          </div>

          {/* Strategy summary */}
          {plan.strategy_summary && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
              <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">✦ {ag.strategyTitle}</p>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{plan.strategy_summary}</p>
            </div>
          )}

          {/* Approve all button */}
          {readyCount > 0 && (
            <div className="flex justify-end">
              <button
                onClick={approveAll}
                disabled={approvingAll}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow"
              >
                {approvingAll ? ag.approvingAll : `${ag.approveAll} (${readyCount})`}
              </button>
            </div>
          )}

          {/* Items list */}
          {items.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                🗂 {ag.itemsTitle}
                {approvedCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-green-300">
                    ✓ {approvedCount}/{plan.items_total} {ag.statusApproved.toLowerCase()}
                  </span>
                )}
              </h2>

              <div className="space-y-3">
                {items
                  .filter(i => ['ready', 'approved', 'rejected'].includes(i.status))
                  .map(item => {
                  const draft      = item.content_drafts
                  // Her zaman Fince caption göster (müşteriye gönderilecek içerik)
                  // Türkçe referans olarak altında gösterilir
                  const captionFi  = draft?.caption_fi
                  const captionTr  = draft?.caption_tr
                  const date    = new Date(item.scheduled_date + 'T00:00:00Z').toLocaleDateString(
                    lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB',
                    { weekday: 'short', month: 'short', day: 'numeric' }
                  )
                  const createdAt = new Date(item.created_at).toLocaleString(
                    lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB',
                    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                  )

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border bg-card overflow-hidden transition-opacity ${
                        item.status === 'approved' ? 'border-green-500/25 bg-green-500/3' :
                        item.status === 'rejected' ? 'border-red-500/15 opacity-50'       :
                        item.status === 'generating' ? 'border-sky-500/25 bg-sky-500/3'   :
                        'border-white/8'
                      }`}
                    >
                      <div className="flex gap-4 p-4">

                        {/* Image */}
                        {draft?.image_url && !imgErrors[item.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={draft.image_url}
                            alt=""
                            className="w-24 h-24 rounded-xl object-cover shrink-0"
                            onError={() => setImgErrors(prev => ({ ...prev, [item.id]: true }))}
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-sky-900/30 border border-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-3xl">🍕</span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Date + badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-sky-300">📅 {date}</span>
                            <PriorityBadge
                              priority={item.priority}
                              labels={[ag.priorityHigh, ag.priorityMed, ag.priorityLow]}
                            />
                            <StatusPill status={item.status} labels={statusMap} />
                          </div>
                          {/* Oluşturulma zamanı */}
                          <p className="text-[10px] text-muted-foreground/40">
                            🕐 {createdAt}
                          </p>

                          {/* Caption — Fince (asıl paylaşım içeriği) */}
                          {captionFi && (
                            <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{captionFi}</p>
                          )}
                          {/* Türkçe referans — sadece UI dili TR ise göster */}
                          {lang === 'tr' && captionTr && captionTr !== captionFi && (
                            <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed border-l-2 border-white/10 pl-2 italic">
                              🇹🇷 {captionTr}
                            </p>
                          )}

                          {/* Hashtags */}
                          {draft?.hashtags && draft.hashtags.length > 0 && (
                            <p className="text-xs text-sky-300/60 truncate">
                              {draft.hashtags.slice(0, 6).map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                            </p>
                          )}

                          {/* Rationale */}
                          {item.rationale && (
                            <details className="group">
                              <summary className="text-xs text-muted-foreground/60 cursor-pointer hover:text-muted-foreground list-none flex items-center gap-1 mt-1">
                                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                                {ag.rationale}
                              </summary>
                              <p className="text-xs text-muted-foreground/80 mt-1 pl-3 border-l border-white/10 leading-relaxed">
                                {item.rationale}
                              </p>
                            </details>
                          )}
                        </div>
                      </div>

                      {/* Action buttons — only for ready items */}
                      {item.status === 'ready' && (
                        <div className="flex gap-2 px-4 pb-4">
                          <button
                            onClick={() => approveItem(item.id)}
                            disabled={approving === item.id || rejecting === item.id}
                            className="flex-1 py-2 rounded-lg bg-green-500/15 border border-green-500/25 text-green-300 text-sm font-medium hover:bg-green-500/22 transition-colors disabled:opacity-40"
                          >
                            {approving === item.id ? '…' : ag.approveBtn}
                          </button>
                          <a
                            href={`/${lang}/content`}
                            className="flex-1 py-2 rounded-lg border border-white/10 text-muted-foreground text-sm text-center font-medium hover:text-foreground hover:border-white/25 transition-colors"
                          >
                            ✏️
                          </a>
                          <button
                            onClick={() => rejectItem(item.id)}
                            disabled={approving === item.id || rejecting === item.id}
                            className="px-4 py-2 rounded-lg border border-red-500/15 text-red-400/60 text-sm font-medium hover:text-red-400 hover:border-red-500/35 transition-colors disabled:opacity-40"
                          >
                            {rejecting === item.id ? '…' : ag.rejectBtn}
                          </button>
                        </div>
                      )}

                      {/* Approved/Rejected state footer */}
                      {(item.status === 'approved' || item.status === 'rejected') && (
                        <div className={`px-4 pb-3 text-xs font-medium ${
                          item.status === 'approved' ? 'text-green-400' : 'text-red-400/60'
                        }`}>
                          {item.status === 'approved' ? `✓ ${ag.statusApproved}` : `✕ ${ag.statusRejected}`}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : !isPlanning && (
            <div className="rounded-2xl border border-white/8 bg-white/2 p-8 text-center">
              <p className="text-muted-foreground text-sm">{ag.noItems}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
