'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Hexagon, Home, Users, FileText, Settings, Mic, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Accueil' },
  { href: '/dashboard/patients', icon: Users, label: 'Patients' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documents' },
  { href: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-apex-border">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
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
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
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
        <Link href="/dashboard/consultation/new" onClick={onNavigate}>
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
    </>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden w-10 h-10 rounded-apex bg-apex-surface border border-apex-border flex items-center justify-center text-apex-text-muted hover:text-white transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-apex-surface border-r border-apex-border flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-64 bg-apex-surface border-r border-apex-border flex flex-col z-50 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-5 right-4 text-apex-text-muted hover:text-white transition-colors"
                aria-label="Fermer le menu"
              >
                <X size={20} />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
