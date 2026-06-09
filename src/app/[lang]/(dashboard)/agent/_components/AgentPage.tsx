'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/useT'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Preview / Edit Modal ─────────────────────────────────────────────────────

interface ModalProps {
  item: AgentItem
  lang: string
  onClose: () => void
  onApprove: (itemId: string) => Promise<void>
  onReject: (itemId: string) => Promise<void>
  onSave: (draftId: string, captionFi: string, hashtags: string[]) => Promise<void>
}

function PreviewModal({ item, lang, onClose, onApprove, onReject, onSave }: ModalProps) {
  const t   = useT()
  const ag  = t.agent
  const draft = item.content_drafts

  const [captionFi,  setCaptionFi]  = useState(draft?.caption_fi  ?? '')
  const [hashtagStr, setHashtagStr] = useState((draft?.hashtags ?? []).map(h => `#${h.replace(/^#/, '')}`).join(' '))
  const [imgError,   setImgError]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [acting,     setActing]     = useState<'approve' | 'reject' | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
  }, [captionFi])

  const date = new Date(item.scheduled_date + 'T00:00:00Z').toLocaleDateString(
    lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long' }
  )

  async function handleSave() {
    if (!draft?.id) return
    setSaving(true)
    const tags = hashtagStr.split(/[\s,]+/).filter(Boolean).map(h => h.replace(/^#/, ''))
    await onSave(draft.id, captionFi, tags)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleApprove() {
    setActing('approve')
    if (draft?.id && (captionFi !== draft.caption_fi || hashtagStr)) {
      const tags = hashtagStr.split(/[\s,]+/).filter(Boolean).map(h => h.replace(/^#/, ''))
      await onSave(draft.id, captionFi, tags)
    }
    await onApprove(item.id)
    onClose()
  }

  async function handleReject() {
    setActing('reject')
    await onReject(item.id)
    onClose()
  }

  const priorityColors: Record<number, string> = { 1: 'text-red-300', 2: 'text-amber-300', 3: 'text-emerald-300' }
  const priorityLabels: Record<number, string> = { 1: ag.priorityHigh, 2: ag.priorityMed, 3: ag.priorityLow }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/12 bg-[#0e1117] shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 sticky top-0 bg-[#0e1117] z-10">
          <div>
            <p className="font-semibold text-foreground">📅 {date}</p>
            <p className={`text-xs mt-0.5 ${priorityColors[item.priority] ?? 'text-muted-foreground'}`}>
              {priorityLabels[item.priority] ?? ''}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Image — full width */}
        <div className="w-full h-80 bg-gradient-to-br from-primary/20 to-sky-900/30 relative overflow-hidden flex-shrink-0">
          {draft?.image_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <span className="text-6xl">🍕</span>
              <p className="text-xs text-muted-foreground/50">Görsel mevcut değil</p>
            </div>
          )}
        </div>

        {/* Edit area */}
        <div className="p-5 space-y-4 flex-1">

          {/* Finnish caption — editable */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              🇫🇮 Fince Kapsiyon
              <span className="text-[10px] font-normal text-muted-foreground/60 normal-case tracking-normal">(paylaşılacak içerik)</span>
            </label>
            <textarea
              ref={textareaRef}
              value={captionFi}
              onChange={e => setCaptionFi(e.target.value)}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Fince kapsiyon…"
            />
          </div>

          {/* Turkish reference — read only */}
          {lang === 'tr' && draft?.caption_tr && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                🇹🇷 Türkçe Referans
                <span className="text-[10px] font-normal normal-case tracking-normal">(yalnızca okuma)</span>
              </label>
              <p className="text-sm text-muted-foreground/70 leading-relaxed bg-white/3 rounded-xl px-4 py-3 border border-white/6 italic">
                {draft.caption_tr}
              </p>
            </div>
          )}

          {/* Hashtags — editable */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"># Hashtag&apos;ler</label>
            <input
              type="text"
              value={hashtagStr}
              onChange={e => setHashtagStr(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-sky-300 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="#hashtag1 #hashtag2 …"
            />
            <p className="text-[10px] text-muted-foreground/40">Boşlukla veya virgülle ayır</p>
          </div>

          {/* Rationale */}
          {item.rationale && (
            <div className="rounded-xl bg-white/3 border border-white/6 px-4 py-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">💡 {ag.rationale}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.rationale}</p>
            </div>
          )}

          {/* Save button */}
          {item.status === 'ready' && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg border border-white/15 text-muted-foreground text-xs hover:text-foreground hover:border-white/30 transition-colors disabled:opacity-40"
              >
                {saving ? '…' : saved ? '✓ Kaydedildi' : '💾 Kaydet'}
              </button>
            </div>
          )}
        </div>

        {/* Action buttons — sticky bottom */}
        {item.status === 'ready' && (
          <div className="flex gap-3 p-5 pt-0 sticky bottom-0 bg-[#0e1117] border-t border-white/8">
            <button
              onClick={handleApprove}
              disabled={!!acting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {acting === 'approve' ? '…' : `✓ ${ag.approveBtn}`}
            </button>
            <button
              onClick={handleReject}
              disabled={!!acting}
              className="px-5 py-3 rounded-xl border border-red-500/25 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-40"
            >
              {acting === 'reject' ? '…' : ag.rejectBtn}
            </button>
          </div>
        )}

        {item.status === 'approved' && (
          <div className="px-5 pb-5 pt-2">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center text-green-300 text-sm font-medium">
              ✓ {ag.statusApproved}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: number }) {
  const colors: Record<number, string> = { 1: 'bg-red-400', 2: 'bg-amber-400', 3: 'bg-emerald-400' }
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[priority] ?? 'bg-white/30'}`} />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentPage({ lang, isPro, plan: initialPlan, items: initialItems }: Props) {
  const t      = useT()
  const ag     = t.agent
  const router = useRouter()

  const [plan,        setPlan]        = useState<AgentPlan | null>(initialPlan)
  const [items,       setItems]       = useState<AgentItem[]>(initialItems)
  const [creating,    setCreating]    = useState(false)
  const [polling,     setPolling]     = useState(false)
  const [createErr,   setCreateErr]   = useState<string | null>(null)
  const [approvingAll,setApprovingAll]= useState(false)
  const [activeModal, setActiveModal] = useState<AgentItem | null>(null)

  const isPlanning = plan?.status === 'planning' || polling

  // ── Polling ────────────────────────────────────────────────────────────────
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
    } catch { setPolling(false) }
  }, [router])

  useEffect(() => {
    if (!polling) return
    const id = setInterval(pollPlan, 4000)
    return () => clearInterval(id)
  }, [polling, pollPlan])

  useEffect(() => {
    if (plan?.status === 'planning') setPolling(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────
  async function createPlan(force = false) {
    setCreating(true); setCreateErr(null)
    try {
      const res  = await fetch('/api/agent/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const json = await res.json() as { planId?: string; error?: string }
      if (!res.ok) { setCreateErr(json.error ?? ag.genError); return }
      setPolling(true)
      await pollPlan()
    } catch { setCreateErr(ag.genError) }
    finally { setCreating(false) }
  }

  async function approveItem(itemId: string) {
    await fetch('/api/agent/plan', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action: 'approve' }),
    })
    setItems(is => is.map(i => i.id === itemId ? { ...i, status: 'approved' } : i))
  }

  async function rejectItem(itemId: string) {
    await fetch('/api/agent/plan', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action: 'reject' }),
    })
    setItems(is => is.map(i => i.id === itemId ? { ...i, status: 'rejected' } : i))
  }

  async function saveDraft(draftId: string, captionFi: string, hashtags: string[]) {
    await fetch(`/api/drafts/${draftId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption_fi: captionFi, hashtags }),
    })
    // Optimistic update in items
    setItems(is => is.map(i =>
      i.content_drafts?.id === draftId
        ? { ...i, content_drafts: { ...i.content_drafts!, caption_fi: captionFi, hashtags } }
        : i
    ))
    // Update modal item too
    setActiveModal(prev => prev && prev.content_drafts?.id === draftId
      ? { ...prev, content_drafts: { ...prev.content_drafts!, caption_fi: captionFi, hashtags } }
      : prev
    )
  }

  async function approveAll() {
    setApprovingAll(true)
    try {
      await fetch('/api/agent/plan', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all' }),
      })
      setItems(is => is.map(i => i.status === 'ready' ? { ...i, status: 'approved' } : i))
      setPlan(p => p ? { ...p, status: 'done', items_approved: p.items_total } : p)
    } catch { /* silent */ } finally { setApprovingAll(false) }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const visibleItems  = items.filter(i => ['ready', 'approved', 'rejected'].includes(i.status))
  const readyCount    = items.filter(i => i.status === 'ready').length
  const approvedCount = items.filter(i => i.status === 'approved').length

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

  const fmtDate = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString(
    lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB',
    { weekday: 'short', month: 'short', day: 'numeric' }
  )

  const fmtTime = (iso: string) => new Date(iso).toLocaleString(
    lang === 'fi' ? 'fi-FI' : lang === 'tr' ? 'tr-TR' : 'en-GB',
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Preview modal */}
      {activeModal && (
        <PreviewModal
          item={activeModal}
          lang={lang}
          onClose={() => setActiveModal(null)}
          onApprove={approveItem}
          onReject={rejectItem}
          onSave={saveDraft}
        />
      )}

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
            <a href={`/${lang}/billing`} className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
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

        {/* ── Errors ── */}
        {createErr && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">❌ {createErr}</div>
        )}
        {plan?.status === 'failed' && plan.error_message && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-300">
            ❌ {ag.statusFailed}: {plan.error_message}
          </div>
        )}

        {/* ── Empty state ── */}
        {isPro && !plan && !creating && !isPlanning && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-12 text-center space-y-3">
            <p className="text-5xl">🗓️</p>
            <p className="font-semibold text-foreground text-base">{ag.noPlan}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{ag.noPlanHint}</p>
            <button
              onClick={() => createPlan(false)} disabled={creating}
              className="mt-4 inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {creating ? ag.creating : ag.createPlan}
            </button>
          </div>
        )}

        {/* ── Plan exists ── */}
        {isPro && plan && plan.status !== 'planning' && (
          <>
            {/* Meta chips */}
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {weekLabel && (
                <span className="px-3 py-1 rounded-full bg-white/6 border border-white/10 text-muted-foreground">
                  📅 {ag.weekOf} <span className="text-foreground font-medium">{weekLabel}</span>
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-white/6 border border-white/10 text-muted-foreground">
                📦 {ag.totalItems} <span className="text-foreground font-medium">{plan.items_total}</span>
              </span>
              <span className={`px-3 py-1 rounded-full font-medium border text-sm ${
                plan.status === 'done'   ? 'bg-green-500/15 border-green-500/25 text-green-300' :
                plan.status === 'ready'  ? 'bg-primary/15 border-primary/25 text-sky-200' :
                plan.status === 'failed' ? 'bg-red-500/15 border-red-500/25 text-red-300' :
                'bg-white/8 border-white/10 text-muted-foreground'
              }`}>
                {plan.status === 'done' ? ag.statusDone : plan.status === 'ready' ? ag.statusReady : plan.status === 'failed' ? ag.statusFailed : ag.statusPlanning}
              </span>
            </div>

            {/* Strategy */}
            {plan.strategy_summary && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider">✦ {ag.strategyTitle}</p>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{plan.strategy_summary}</p>
              </div>
            )}

            {/* Approve all */}
            {readyCount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {approvedCount > 0 && <span className="text-green-300 font-medium">✓ {approvedCount} onaylandı · </span>}
                  <span className="text-sky-300">{readyCount} onay bekliyor</span>
                </p>
                <button
                  onClick={approveAll} disabled={approvingAll}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow"
                >
                  {approvingAll ? ag.approvingAll : `${ag.approveAll} (${readyCount})`}
                </button>
              </div>
            )}

            {/* Items grid */}
            {visibleItems.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-foreground">🗂 {ag.itemsTitle}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleItems.map(item => {
                    const draft = item.content_drafts
                    const captionFi = draft?.caption_fi ?? ''
                    const isApproved = item.status === 'approved'
                    const isRejected = item.status === 'rejected'

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveModal(item)}
                        className={`rounded-2xl border bg-card overflow-hidden cursor-pointer group transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${
                          isApproved ? 'border-green-500/30 bg-green-500/3' :
                          isRejected ? 'border-red-500/15 opacity-40'       :
                          'border-white/8'
                        }`}
                      >
                        {/* Image strip */}
                        <div className="relative w-full aspect-video bg-gradient-to-br from-primary/15 to-sky-900/20 overflow-hidden">
                          {draft?.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={draft.image_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl opacity-30">🍕</span>
                            </div>
                          )}
                          {/* Status overlay */}
                          {isApproved && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <span className="text-3xl">✅</span>
                            </div>
                          )}
                          {/* Date badge */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-xs font-medium text-white flex items-center gap-1.5">
                            <PriorityDot priority={item.priority} />
                            {fmtDate(item.scheduled_date)}
                          </div>
                          {/* Edit hint */}
                          {!isApproved && !isRejected && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-white text-xs font-medium">
                                👁 Önizle &amp; Düzenle
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3 space-y-2">
                          {captionFi ? (
                            <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{captionFi}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground/40 italic">Kapsiyon yok</p>
                          )}
                          {draft?.hashtags && draft.hashtags.length > 0 && (
                            <p className="text-xs text-sky-300/60 truncate">
                              {draft.hashtags.slice(0, 4).map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground/50">🕐 {fmtTime(item.created_at)}</p>
                            {isApproved && <span className="text-[10px] text-green-400 font-medium">✓ Onaylandı</span>}
                            {isRejected && <span className="text-[10px] text-red-400/60 font-medium">✕ Reddedildi</span>}
                          </div>
                        </div>
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
    </>
  )
}
