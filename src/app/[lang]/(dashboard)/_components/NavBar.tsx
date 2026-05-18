'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface NavLink {
  href: string
  label: string
  icon: string
}

interface Props {
  links: NavLink[]
  email: string
}

export function NavBar({ links, email }: Props) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

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

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {links.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
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

          {/* Tablet nav — sadece ikonlar */}
          <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1">
            {links.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors ${
                    active
                      ? 'text-foreground bg-white/8 border border-white/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {link.icon}
                </Link>
              )
            })}
          </nav>

          <div className="flex-1 lg:flex-none" />

          {/* User badge — desktop */}
          <div className="hidden sm:flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 bg-white/4">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground font-mono hidden md:block max-w-[120px] truncate">
              {email}
            </span>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/4 gap-1.5 shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menü"
          >
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="block w-4 h-0.5 bg-foreground rounded-full"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block w-4 h-0.5 bg-foreground rounded-full"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="block w-4 h-0.5 bg-foreground rounded-full"
            />
          </button>

        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-0 top-14 z-40 bg-background/97 backdrop-blur-md flex flex-col"
          >
            {/* User info */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {email.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
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
                        active
                          ? 'bg-white/10 text-foreground border border-white/10'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }`}
                    >
                      <span className="text-2xl w-8 text-center">{link.icon}</span>
                      <span>{link.label}</span>
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
