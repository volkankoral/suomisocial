'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useT } from '@/lib/useT'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Review {
  id: string
  platform: 'google_business' | 'facebook' | 'instagram'
  author_name: string | null
  author_avatar_url: string | null
  rating: number | null
  comment_text: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  reply_status: 'pending' | 'drafted' | 'posted' | null
  reply_text: string | null
  reply_posted_at: string | null
  is_featured: boolean
  review_created_at: string | null
}

interface Settings {
  widget_enabled: boolean | null
  widget_min_rating: number | null
  notify_email: string | null
}

interface Filters {
  platform: string
  sentiment: string
  status: string
}

interface Props {
  lang: string
  orgId: string
  initialReviews: Review[]
  totalCount: number
  totalPages: number
  currentPage: number
  filters: Filters
  settings: Settings | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'google_business') return <span title="Google Business">🔍</span>
  if (platform === 'facebook')        return <span title="Facebook">📘</span>
  if (platform === 'instagram')       return <span title="Instagram">📸</span>
  return <span>🌐</span>
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null
  const styles = {
    positive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    neutral:  'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
    negative: 'bg-red-500/15 text-red-400 border-red-500/20',
  }
  const icons = { positive: '😊', neutral: '😐', negative: '😠' }
  const key = sentiment as keyof typeof styles
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${styles[key] ?? ''}`}>
      {icons[key]} {sentiment}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
      ⏳ pending
    </span>
  )
  if (status === 'drafted') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/20">
      📝 drafted
    </span>
  )
  if (status === 'posted') return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-400 border-sky-500/20">
      ✅ posted
    </span>
  )
  return null
}

function Avatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name ?? ''} className="w-9 h-9 rounded-full object-cover shrink-0" />
  )
  const letter = name?.charAt(0)?.toUpperCase() ?? '?'
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-sky-500/50 flex items-center justify-center text-sm font-bold text-white shrink-0">
      {letter}
    </div>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '' }
}

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onGenerate,
  onPost,
  onToggleFeatured,
}: {
  review: Review
  onGenerate: (id: string) => Promise<string | null>
  onPost: (id: string, text: string) => Promise<boolean>
  onToggleFeatured: (id: string, current: boolean) => Promise<void>
}) {
  const t = useT()
  const [localReview, setLocalReview] = useState(review)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting]     = useState(false)
  const [isEditing, setIsEditing]     = useState(false)
  const [editText, setEditText]       = useState(review.reply_text ?? '')
  const [error, setError]             = useState<string | null>(null)
  const [featurePending, setFeaturePending] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    const reply = await onGenerate(localReview.id)
    if (reply) {
      setLocalReview(r => ({ ...r, reply_text: reply, reply_status: 'drafted' }))
      setEditText(reply)
    } else {
      setError(t.reviews.errorGenerate)
    }
    setIsGenerating(false)
  }

  async function handlePost() {
    const text = isEditing ? editText : (localReview.reply_text ?? '')
    if (!text.trim()) return
    if (!confirm(t.reviews.postConfirm)) return
    setIsPosting(true)
    setError(null)
    const ok = await onPost(localReview.id, text)
    if (ok) {
      setLocalReview(r => ({ ...r, reply_text: text, reply_status: 'posted', reply_posted_at: new Date().toISOString() }))
      setIsEditing(false)
    } else {
      setError(t.reviews.errorPost)
    }
    setIsPosting(false)
  }

  async function handleToggleFeatured() {
    setFeaturePending(true)
    await onToggleFeatured(localReview.id, localReview.is_featured)
    setLocalReview(r => ({ ...r, is_featured: !r.is_featured }))
    setFeaturePending(false)
  }

  const replyText = isEditing ? editText : (localReview.reply_text ?? '')
  const canEdit   = localReview.reply_status === 'drafted'
  const canPost   = (localReview.reply_status === 'drafted' || isEditing) && replyText.trim().length > 0
  const hasReply  = !!localReview.reply_text && localReview.reply_status !== 'pending'

  return (
    <div className={`rounded-xl border p-4 sm:p-5 transition-all ${
      localReview.sentiment === 'negative'
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-white/8 bg-white/[0.03]'
    }`}>

      {/* Header row */}
      <div className="flex items-start gap-3">
        <Avatar name={localReview.author_name} avatarUrl={localReview.author_avatar_url} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">
              {localReview.author_name ?? 'Anonim'}
            </span>
            <PlatformIcon platform={localReview.platform} />
            <Stars rating={localReview.rating} />
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDate(localReview.review_created_at)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <SentimentBadge sentiment={localReview.sentiment} />
            <StatusBadge status={localReview.reply_status} />
          </div>
        </div>
      </div>

      {/* Review text */}
      {localReview.comment_text && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-4">
          {localReview.comment_text}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Reply section */}
      {hasReply && (
        <div className="mt-3 rounded-lg border border-white/8 bg-white/3 p-3">
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">
            {t.reviews.replyLabel}
          </p>
          {isEditing ? (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary/50"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {localReview.reply_text}
            </p>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">

        {/* Generate — only for pending or to regenerate */}
        {localReview.reply_status !== 'posted' && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isPosting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/25 text-xs font-medium hover:bg-primary/25 transition-colors disabled:opacity-50"
          >
            {isGenerating ? t.reviews.generating : t.reviews.generateDraft}
          </button>
        )}

        {/* Edit / Cancel edit */}
        {canEdit && !isEditing && (
          <button
            onClick={() => { setIsEditing(true); setEditText(localReview.reply_text ?? '') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground border border-white/10 text-xs font-medium hover:text-foreground hover:bg-white/10 transition-colors"
          >
            ✏️ {t.reviews.editDraft}
          </button>
        )}
        {isEditing && (
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground border border-white/10 text-xs font-medium hover:text-foreground hover:bg-white/10 transition-colors"
          >
            {t.reviews.cancelEdit}
          </button>
        )}

        {/* Post */}
        {canPost && localReview.reply_status !== 'posted' && (
          <button
            onClick={handlePost}
            disabled={isPosting || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25 text-xs font-medium hover:bg-sky-500/25 transition-colors disabled:opacity-50"
          >
            {isPosting ? t.reviews.posting : t.reviews.postReply}
          </button>
        )}

        {/* Featured toggle */}
        <button
          onClick={handleToggleFeatured}
          disabled={featurePending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ml-auto ${
            localReview.is_featured
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/25'
              : 'bg-white/5 text-muted-foreground border-white/10 hover:text-foreground hover:bg-white/10'
          }`}
        >
          {featurePending ? '…' : (localReview.is_featured ? t.reviews.featuredOn : t.reviews.featuredOff)}
        </button>
      </div>
    </div>
  )
}

// ─── Widget embed panel ───────────────────────────────────────────────────────

function WidgetEmbedPanel({ orgId, settings }: { orgId: string; settings: Settings | null }) {
  const [copied, setCopied] = useState(false)
  const [theme, setTheme]   = useState<'dark' | 'light'>('dark')
  const codeRef = useRef<HTMLElement>(null)

  const snippet = `<!-- Occaly Reviews Widget -->
<div id="occaly-reviews"></div>
<script
  src="https://occaly.com/widget/reviews.js"
  data-org-id="${orgId}"
  data-theme="${theme}"
></script>`

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const widgetEnabled = settings?.widget_enabled !== false

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
        <span className="text-xl">🔌</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Web Sitesi Widget</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Yüksek puanlı yorumları müşteri web sitenize gömün
          </p>
        </div>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${
          widgetEnabled
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
            : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
        }`}>
          {widgetEnabled ? '● Aktif' : '● Kapalı'}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Theme selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0">Tema:</span>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/3 p-0.5">
            {(['dark', 'light'] as const).map(th => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  theme === th
                    ? 'bg-white/15 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {th === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
          {settings?.widget_min_rating && (
            <span className="text-xs text-muted-foreground ml-auto">
              Min. {settings.widget_min_rating}★ gösteriliyor
            </span>
          )}
        </div>

        {/* Code block */}
        <div className="relative rounded-lg border border-white/8 bg-zinc-950 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/[0.02]">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-mono">HTML</span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
              }`}
            >
              {copied ? '✓ Kopyalandı' : '⎘ Kopyala'}
            </button>
          </div>
          <pre className="px-4 py-3 overflow-x-auto text-xs leading-relaxed">
            <code ref={codeRef} className="text-zinc-300 font-mono whitespace-pre">
              {snippet}
            </code>
          </pre>
        </div>

        {/* Instructions */}
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Yukarıdaki kodu kopyalayın</li>
          <li>Yorumların görünmesini istediğiniz web sayfasına yapıştırın</li>
          <li>Vitrin (⭐) butonuyla hangi yorumların gösterileceğini seçin</li>
        </ol>

        {/* API URL (for advanced users) */}
        <details className="text-xs">
          <summary className="text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors">
            Gelişmiş: JSON API endpoint'i
          </summary>
          <div className="mt-2 px-3 py-2 rounded-lg bg-white/3 border border-white/8">
            <code className="text-primary/70 break-all font-mono">
              {`https://occaly.com/api/widget/reviews/${orgId}`}
            </code>
          </div>
        </details>
      </div>
    </div>
  )
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

function FilterBar({ filters }: { filters: Filters }) {
  const t       = useT()
  const router  = useRouter()
  const pathname = usePathname()
  const sp      = useSearchParams()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    params.set(key, value)
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const platforms = [
    { key: 'all',              label: t.reviews.all },
    { key: 'google_business',  label: t.reviews.google },
    { key: 'facebook',         label: t.reviews.facebook },
    { key: 'instagram',        label: t.reviews.instagram },
  ]
  const sentiments = [
    { key: 'all',      label: t.reviews.sentimentAll },
    { key: 'positive', label: t.reviews.positive },
    { key: 'neutral',  label: t.reviews.neutral },
    { key: 'negative', label: t.reviews.negative },
  ]
  const statuses = [
    { key: 'all',     label: t.reviews.statusAll },
    { key: 'pending', label: t.reviews.pending },
    { key: 'drafted', label: t.reviews.drafted },
    { key: 'posted',  label: t.reviews.posted },
  ]

  return (
    <div className="flex flex-col gap-2">
      {/* Platform tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {platforms.map(p => (
          <button
            key={p.key}
            onClick={() => setFilter('platform', p.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.platform === p.key
                ? 'bg-white/10 text-foreground border border-white/15'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sentiment + Status dropdowns */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.sentiment}
          onChange={e => setFilter('sentiment', e.target.value)}
          className="text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-muted-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          {sentiments.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          className="text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-muted-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          {statuses.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ReviewsPage({
  lang,
  orgId,
  initialReviews,
  totalCount,
  totalPages,
  currentPage,
  filters,
  settings,
}: Props) {
  const t      = useT()
  const router = useRouter()
  const pathname = usePathname()
  const sp     = useSearchParams()
  const [, startTransition] = useTransition()

  // ── API calls ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/reviews/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft' }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.reply ?? null
    } catch { return null }
  }, [])

  const handlePost = useCallback(async (id: string, text: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/reviews/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post', reply_text: text }),
      })
      return res.ok
    } catch { return false }
  }, [])

  const handleToggleFeatured = useCallback(async (id: string, current: boolean): Promise<void> => {
    await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !current }),
    })
  }, [])

  // ── Pagination ─────────────────────────────────────────────────────────────

  function goToPage(p: number) {
    const params = new URLSearchParams(sp.toString())
    params.set('page', String(p))
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  // ── Stats banner ───────────────────────────────────────────────────────────

  const negativeCount  = initialReviews.filter(r => r.sentiment === 'negative').length
  const pendingCount   = initialReviews.filter(r => !r.reply_status || r.reply_status === 'pending').length
  const featuredCount  = initialReviews.filter(r => r.is_featured).length

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.reviews.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t.reviews.subtitle}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs text-muted-foreground">Toplam Yorum</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs text-red-400/70">Olumsuz (sayfa)</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{negativeCount}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-400/70">Cevap Bekliyor (sayfa)</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-xs text-amber-300/70">Vitrin</p>
          <p className="text-2xl font-bold text-amber-300 mt-1">{featuredCount}</p>
        </div>
      </div>

      {/* Widget embed panel */}
      <WidgetEmbedPanel orgId={orgId} settings={settings} />

      {/* Filters */}
      <FilterBar filters={filters} />

      {/* Review list */}
      {initialReviews.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] py-20 text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-foreground font-medium">{t.reviews.noReviews}</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">{t.reviews.noReviewsHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onGenerate={handleGenerate}
              onPost={handlePost}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.reviews.prevPage}
          </button>
          <span className="text-sm text-muted-foreground">
            {t.reviews.page} {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.reviews.nextPage}
          </button>
        </div>
      )}
    </div>
  )
}
