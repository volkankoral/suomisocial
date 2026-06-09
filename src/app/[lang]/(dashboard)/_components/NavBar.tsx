'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useT } from '@/lib/useT'

interface NavLink {
  href: string
  label: string
  icon: string
}

interface Props {
  links: NavLink[]
  email: string
  lang: string
}

const LANG_OPTIONS = [
  { code: 'tr', flag: '🇹🇷', label: 'TR' },
  { code: 'fi', flag: '🇫🇮', label: 'FI' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
]

export function NavBar({ links, email, lang }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const t        = useT()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [langOpen, setLangOpen]   = useState(false)
  const [userOpen, setUserOpen]   = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  function switchLang(newLang: string) {
    // Tercih cookie'sini 1 yıllığına yaz — bir sonraki ziyarette IP otomatik dilini geçersiz kılar
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

    // /tr/content → /fi/content
    const segments = pathname.split('/')
    segments[1] = newLang
    router.push(segments.join('/'))
    setLangOpen(false)
    setMenuOpen(false)
  }

  async function logout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push(`/${lang}/login`)
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  const currentLang = LANG_OPTIONS.find(l => l.code === lang) ?? LANG_OPTIONS[0]

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 glass-heavy px-4 sm:px-5 py-0">
        <div className="mx-auto max-w-7xl flex items-center gap-3 h-14">

          {/* Logo */}
          <Link
            href={links[0]?.href ?? '#'}
            className="flex items-center shrink-0 mr-2"
            onClick={() => setMenuOpen(false)}
          >
            <img src="/logo.svg" alt="Occaly" className="h-7 sm:h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {links.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-white/8 border border-white/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 text-base leading-none">{link.icon}</span>
                  <span className="relative z-10">{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Tablet nav — icon only */}
          <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1">
            {links.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors ${
                    active ? 'text-foreground bg-white/8 border border-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {link.icon}
                </Link>
              )
            })}
          </nav>

          <div className="flex-1 lg:flex-none" />

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setMenuOpen(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/4 text-sm hover:border-white/20 transition-colors"
            >
              <span>{currentLang.flag}</span>
              <span className="text-xs font-medium text-muted-foreground hidden sm:block">{currentLang.label}</span>
              <span className="text-[10px] text-muted-foreground/60">▾</span>
            </button>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-white/12 bg-zinc-900 shadow-2xl overflow-hidden z-50"
                >
                  {LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => switchLang(opt.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        opt.code === lang
                          ? 'bg-white/8 text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                    >
                      <span>{opt.flag}</span>
                      <span>{t.langSwitcher[opt.code as 'tr' | 'fi' | 'en']}</span>
                      {opt.code === lang && <span className="ml-auto text-primary text-xs">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User badge + dropdown */}
          <div className="hidden sm:block relative">
            <button
              onClick={() => { setUserOpen(!userOpen); setLangOpen(false) }}
              className="flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 bg-white/4 hover:border-white/20 transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-primary flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground font-mono hidden md:block max-w-[120px] truncate">
                {email}
              </span>
              <span className="text-[10px] text-muted-foreground/60">▾</span>
            </button>

            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-white/12 bg-zinc-900 shadow-2xl overflow-hidden z-50"
                >
                  <div className="px-4 py-2.5 border-b border-white/8">
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                  <button
                    onClick={logout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <span>🚪</span>
                    <span>{loggingOut ? '…' : t.auth.logout}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/4 gap-1.5 shrink-0"
            onClick={() => { setMenuOpen(!menuOpen); setLangOpen(false) }}
            aria-label="Menü"
          >
            <motion.span animate={menuOpen ? { rotate: 45, y: 6 }  : { rotate: 0, y: 0 }} className="block w-4 h-0.5 bg-foreground rounded-full" />
            <motion.span animate={menuOpen ? { opacity: 0 }         : { opacity: 1 }}      className="block w-4 h-0.5 bg-foreground rounded-full" />
            <motion.span animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="block w-4 h-0.5 bg-foreground rounded-full" />
          </button>

        </div>
      </header>

      {/* Click-away for dropdowns */}
      {(langOpen || userOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setLangOpen(false); setUserOpen(false) }} />
      )}

      {/* Mobile full menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-0 top-14 z-40 bg-background/97 backdrop-blur-md flex flex-col"
          >
            {/* User + lang row */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {email.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-muted-foreground truncate max-w-[180px]">{email}</p>
              </div>
              {/* Mobile lang switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/4 p-1">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => switchLang(opt.code)}
                    className={`px-2 py-1 rounded-md text-sm transition-colors ${
                      opt.code === lang ? 'bg-white/15 text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.flag}
                  </button>
                ))}
              </div>
            </div>

            {/* Links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {links.map((link, i) => {
                const active = isActive(link.href)
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl mb-1 transition-colors text-base font-medium ${
                        active ? 'bg-white/10 text-foreground border border-white/10' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                    >
                      <span className="text-2xl w-8 text-center">{link.icon}</span>
                      <span>{link.label}</span>
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>

            {/* Logout */}
            <div className="border-t border-white/8 p-3">
              <button
                onClick={logout}
                disabled={loggingOut}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl w-8 text-center">🚪</span>
                <span>{loggingOut ? '…' : t.auth.logout}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
