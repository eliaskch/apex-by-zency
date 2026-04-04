'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Hexagon, Home, Users, FileText, Settings, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Accueil' },
  { href: '/dashboard/patients', icon: Users, label: 'Patients' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documents' },
  { href: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-apex-surface border-r border-apex-border flex flex-col z-30">
      {/* Logo */}
      <div className="p-6 border-b border-apex-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative">
            <Hexagon className="w-8 h-8 text-apex-primary" strokeWidth={1.5} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              A
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-white leading-none">APEX</p>
            <p className="text-[11px] text-apex-text-muted">by Zency</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-apex text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-apex-primary/15 text-apex-primary border border-apex-primary/20'
                    : 'text-apex-text-muted hover:text-apex-text hover:bg-apex-surface-2'
                )}
              >
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {item.label}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* CTA nouvelle consultation */}
      <div className="p-4 border-t border-apex-border">
        <Link href="/dashboard/consultation/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-apex bg-apex-gradient text-white text-sm font-semibold shadow-apex-glow transition-all"
          >
            <Mic size={16} />
            Nouvelle consultation
          </motion.button>
        </Link>
      </div>
    </aside>
  )
}
