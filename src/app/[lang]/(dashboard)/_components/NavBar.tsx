'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

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

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 glass-heavy px-5 py-0">
      <div className="mx-auto max-w-7xl flex items-center gap-4 h-14">

        {/* Logo */}
        <Link href={links[0]?.href ?? '#'} className="flex items-center shrink-0 mr-2">
          <img src="/logo.svg" alt="Occaly" className="h-8 w-auto" />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {isActive && (
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

        {/* User badge */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 bg-white/4">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            {email.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground font-mono hidden sm:block max-w-[140px] truncate">
            {email}
          </span>
        </div>

      </div>
    </header>
  )
}
