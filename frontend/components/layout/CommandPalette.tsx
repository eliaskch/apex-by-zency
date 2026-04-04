'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Plus, FileText, Mic, X } from 'lucide-react'
import { useSearchPatients } from '@/hooks/usePatients'
import { formatDate } from '@/lib/utils'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { data: patients } = useSearchPatients(query)

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const navigate = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      router.push(href)
    },
    [router]
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-0 top-[20%] mx-auto w-full max-w-xl z-[61]"
          >
            <Command
              className="glass rounded-apex-xl border border-apex-border shadow-2xl overflow-hidden"
              shouldFilter={false}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 border-b border-apex-border">
                <Search size={16} className="text-apex-text-muted shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Rechercher un patient, une action…"
                  className="h-12 flex-1 bg-transparent text-sm text-apex-text placeholder:text-apex-text-muted focus:outline-none"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="text-apex-text-muted hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-apex-text-muted">
                  Aucun résultat
                </Command.Empty>

                {/* Patient search results */}
                {patients && patients.length > 0 && (
                  <Command.Group
                    heading={
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-apex-text-muted px-2">
                        Patients
                      </span>
                    }
                  >
                    {patients.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`${p.first_name} ${p.last_name}`}
                        onSelect={() => navigate(`/dashboard/patients/${p.id}`)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-apex text-sm cursor-pointer text-apex-text hover:bg-apex-surface-2 transition-colors data-[selected=true]:bg-apex-surface-2"
                      >
                        <Users size={14} className="text-apex-text-muted shrink-0" />
                        <span className="font-medium text-white">
                          {p.first_name} {p.last_name}
                        </span>
                        {p.birth_date && (
                          <span className="text-xs text-apex-text-muted ml-auto">
                            né(e) le {formatDate(p.birth_date)}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Quick actions */}
                <Command.Group
                  heading={
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-apex-text-muted px-2">
                      Actions rapides
                    </span>
                  }
                >
                  <Command.Item
                    onSelect={() => navigate('/dashboard/patients')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-apex text-sm cursor-pointer text-apex-text hover:bg-apex-surface-2 transition-colors data-[selected=true]:bg-apex-surface-2"
                  >
                    <Plus size={14} className="text-apex-primary shrink-0" />
                    <span>Nouveau patient</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => navigate('/dashboard/consultation/new')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-apex text-sm cursor-pointer text-apex-text hover:bg-apex-surface-2 transition-colors data-[selected=true]:bg-apex-surface-2"
                  >
                    <Mic size={14} className="text-apex-secondary shrink-0" />
                    <span>Nouvelle consultation</span>
                  </Command.Item>
                  <Command.Item
                    onSelect={() => navigate('/dashboard/documents')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-apex text-sm cursor-pointer text-apex-text hover:bg-apex-surface-2 transition-colors data-[selected=true]:bg-apex-surface-2"
                  >
                    <FileText size={14} className="text-apex-accent shrink-0" />
                    <span>Voir les documents</span>
                  </Command.Item>
                </Command.Group>

                {/* Shortcut hint */}
                <div className="px-3 py-2 mt-1 border-t border-apex-border">
                  <p className="text-[10px] text-apex-text-muted">
                    <kbd className="px-1.5 py-0.5 bg-apex-surface-2 rounded text-[10px] font-mono">
                      Ctrl+K
                    </kbd>{' '}
                    pour ouvrir • <kbd className="px-1.5 py-0.5 bg-apex-surface-2 rounded text-[10px] font-mono">Esc</kbd> pour fermer
                  </p>
                </div>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
