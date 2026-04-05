'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LogOut, User, Settings } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

export function Header() {
  const { practitioner, isLoading, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!practitioner) {
    return (
      <header className="h-16 border-b border-apex-border bg-apex-dark/80 backdrop-blur-sm flex items-center justify-end px-6">
        {isLoading && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-apex-surface-2 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-20 h-3 bg-apex-surface-2 rounded animate-pulse" />
              <div className="w-28 h-2.5 bg-apex-surface-2 rounded animate-pulse" />
            </div>
          </div>
        )}
      </header>
    )
  }

  const initials = getInitials(practitioner.first_name, practitioner.last_name)

  return (
    <header className="h-16 border-b border-apex-border bg-apex-dark/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div />

      {/* Avatar + dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-3 hover:bg-apex-surface px-3 py-2 rounded-apex transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-apex-gradient flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-apex-text leading-none">
              Dr {practitioner.last_name}
            </p>
            <p className="text-xs text-apex-text-muted mt-0.5">{practitioner.email}</p>
          </div>
          <ChevronDown
            size={14}
            className={`text-apex-text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 glass rounded-apex-lg shadow-glass z-20 overflow-hidden"
              >
                <div className="p-2 space-y-0.5">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-apex-text-muted hover:text-apex-text hover:bg-apex-surface rounded-apex transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User size={15} />
                    Mon profil
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-apex-text-muted hover:text-apex-text hover:bg-apex-surface rounded-apex transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings size={15} />
                    Paramètres
                  </Link>
                  <div className="my-1 border-t border-apex-border" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-apex-error hover:bg-apex-error/10 rounded-apex transition-colors"
                  >
                    <LogOut size={15} />
                    Se déconnecter
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
