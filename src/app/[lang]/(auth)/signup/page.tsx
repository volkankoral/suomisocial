'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/lib/useT'

function mapSignupError(msg: string, a: ReturnType<typeof useT>['auth']): string {
  const m = msg.toLowerCase()
  if (m.includes('already registered') || m.includes('already in use') || m.includes('user already exists') || m.includes('duplicate'))
    return a.errEmailInUse
  if (m.includes('password') && (m.includes('weak') || m.includes('strength') || m.includes('policy')))
    return a.errWeakPassword
  if (m.includes('too many') || m.includes('rate limit') || m.includes('429'))
    return a.errTooManyRequests
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
    return a.errNetwork
  return a.errSignupFailed
}

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [error, setError]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)

  const router = useRouter()
  const params = useParams()
  const lang   = (params?.lang as string) ?? 'tr'
  const t      = useT()
  const a      = t.auth

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError(a.passwordMismatch)
      return
    }
    if (password.length < 8) {
      setError(a.passwordTooShort)
      return
    }

    setLoading(true)

    try {
      const res  = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, businessName }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(mapSignupError(data.error ?? '', a))
        setLoading(false)
        return
      }

      if (data.needsEmailConfirm) {
        setDone(true)
        setLoading(false)
      } else {
        router.push(`/${lang}/brand?new=1`)
        router.refresh()
      }
    } catch {
      setError(a.errNetwork)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background overflow-hidden">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Occaly" className="h-10 w-auto mb-3" />
          <p className="text-sm text-muted-foreground">{a.signupSubtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            /* E-posta onayı bekleniyor */
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-premium p-8 text-center"
            >
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-lg font-bold text-foreground mb-2">{a.emailConfirmTitle}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">{email}</span>{' '}{a.emailConfirmDesc}
              </p>
              <Link
                href={`/${lang}/login`}
                className="mt-6 block text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {a.backToLogin}
              </Link>
            </motion.div>
          ) : (
            /* Kayıt formu */
            <motion.div key="form" className="card-premium p-6">
              <form onSubmit={handleSubmit} className="space-y-4">

                <div className="space-y-1.5">
                  <label htmlFor="businessName" className="text-sm font-medium text-foreground">
                    {a.businessName}
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    placeholder="Golden Pizzeria"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    required
                    autoComplete="organization"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    {a.email}
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="ornek@pizzeria.fi"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    {a.password}
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder={a.passwordPlaceholder}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium text-foreground">
                    {a.passwordRepeat}
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    placeholder={a.passwordRepeatPh}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-1 transition-all ${
                      confirm && confirm !== password
                        ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20'
                        : 'border-white/10 focus:border-primary/60 focus:ring-primary/30'
                    }`}
                  />
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 mt-1">{a.passwordMismatch}</p>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-500/25 bg-red-950/20 px-3.5 py-2.5"
                  >
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!!confirm && confirm !== password)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-900/25 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {a.creatingAccount}
                    </span>
                  ) : (
                    a.createAccount
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  {a.hasAccount}{' '}
                  <Link href={`/${lang}/login`} className="text-primary hover:text-primary/80 font-medium transition-colors">
                    {a.loginLink}
                  </Link>
                </p>

              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Occaly · {a.tagline}
        </p>
      </motion.div>
    </main>
  )
}
