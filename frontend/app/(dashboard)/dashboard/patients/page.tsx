'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Search, Plus, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePatients } from '@/hooks/usePatients'
import { PatientDrawer } from '@/components/patient/PatientDrawer'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

const LIMIT = 20

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search — 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const { data, isLoading } = usePatients(debouncedSearch, page, LIMIT)

  const patients = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients</h1>
          {total > 0 && (
            <p className="text-sm text-apex-text-muted mt-1">
              {total} patient{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus size={16} className="mr-2" />
          Nouveau patient
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-apex-text-muted"
          />
          <input
            id="patient-search"
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Rechercher un patient…"
            className="w-full h-11 pl-11 pr-4 rounded-apex bg-apex-surface border border-apex-border text-sm text-apex-text placeholder:text-apex-text-muted focus:outline-none focus:ring-2 focus:ring-apex-primary focus:border-transparent transition-all duration-200"
          />
        </div>
      </motion.div>

      {/* Table / States */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          /* Skeleton Loader — 5 lignes */
          <div className="glass rounded-apex-xl border border-apex-border overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-apex-border">
              {['Nom', 'Prénom', 'Téléphone', 'Né(e) le'].map((h) => (
                <div key={h} className="text-xs font-medium text-apex-text-muted uppercase tracking-wider">
                  {h}
                </div>
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-apex-border last:border-0">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-4 bg-apex-surface-2 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                ))}
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          /* État vide */
          <div className="glass rounded-apex-xl border border-apex-border p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-apex-surface-2 flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-apex-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {debouncedSearch ? 'Aucun résultat' : 'Aucun patient'}
            </h3>
            <p className="text-apex-text-muted text-sm mb-6 max-w-sm mx-auto">
              {debouncedSearch
                ? `Aucun patient ne correspond à "${debouncedSearch}"`
                : 'Commencez par ajouter votre premier patient pour gérer vos dossiers médicaux.'
              }
            </p>
            {!debouncedSearch && (
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus size={16} className="mr-2" />
                Ajouter votre premier patient
              </Button>
            )}
          </div>
        ) : (
          /* Table des patients */
          <div className="glass rounded-apex-xl border border-apex-border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-apex-border bg-apex-surface/50">
              <div className="text-xs font-medium text-apex-text-muted uppercase tracking-wider">Nom</div>
              <div className="text-xs font-medium text-apex-text-muted uppercase tracking-wider">Prénom</div>
              <div className="text-xs font-medium text-apex-text-muted uppercase tracking-wider">Téléphone</div>
              <div className="text-xs font-medium text-apex-text-muted uppercase tracking-wider">Né(e) le</div>
            </div>

            {/* Rows */}
            {patients.map((patient) => (
              <Link
                key={patient.id}
                href={`/dashboard/patients/${patient.id}`}
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-apex-border last:border-0 cursor-pointer transition-colors group"
                >
                  <span className="text-sm text-white font-medium group-hover:text-apex-primary transition-colors">
                    {patient.last_name}
                  </span>
                  <span className="text-sm text-apex-text">
                    {patient.first_name}
                  </span>
                  <span className="text-sm text-apex-text-muted">
                    {patient.phone || '—'}
                  </span>
                  <span className="text-sm text-apex-text-muted">
                    {patient.birth_date ? formatDate(patient.birth_date) : '—'}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <p className="text-sm text-apex-text-muted">
            Page {page + 1} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={14} className="mr-1" />
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Drawer */}
      <PatientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </motion.div>
  )
}
