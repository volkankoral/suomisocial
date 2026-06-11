'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/useT'
import { NAV_GROUPS, type NavGroupKey } from '@/lib/nav-groups'

interface Props {
  group: NavGroupKey
  lang:  string
}

/**
 * Gruplanan sayfaların üstünde gösterilen ikincil sekme çubuğu.
 * Üst menüde 6 ana öğe, her grubun içinde bu sekmelerle alt sayfalar.
 */
export function SectionTabs({ group, lang }: Props) {
  const pathname = usePathname()
  const t        = useT()
  const tabs     = NAV_GROUPS[group]

  return (
    <div className="mb-6 flex items-center gap-1 border-b border-white/8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {tabs.map(tab => {
        const href     = `/${lang}/${tab.segment}`
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.navGroups[tab.labelKey]}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
