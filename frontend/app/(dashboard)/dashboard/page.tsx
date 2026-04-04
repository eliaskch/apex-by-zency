'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mic, Users, FileText, Clock, Plus, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePatients } from '@/hooks/usePatients'
import { formatDate } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const practitioner = useAuthStore((s) => s.practitioner)
  const { data: patientsData } = usePatients('', 0, 1)

  const patientCount = patientsData?.total ?? 0
  const today = formatDate(new Date())

  const STATS = [
    { label: 'Patients', value: String(patientCount), icon: Users, color: 'text-apex-primary', href: '/dashboard/patients' },
    { label: 'Consultations ce mois', value: '0', icon: Mic, color: 'text-apex-secondary', href: undefined },
    { label: 'Documents générés', value: '0', icon: FileText, color: 'text-apex-accent', href: undefined },
    { label: 'Temps économisé', value: '0 min', icon: Clock, color: 'text-apex-text-muted', href: undefined },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white">
          Bonjour Dr {practitioner?.last_name ?? ''}{' '}
          <span className="font-display italic text-apex-text-muted">👋</span>
        </h1>
        <p className="text-apex-text-muted mt-1">{today}</p>
      </motion.div>

      {/* Statistiques */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Wrapper = stat.href ? Link : 'div'
          const wrapperProps = stat.href ? { href: stat.href } : {}
          return (
            <Wrapper
              key={stat.label}
              {...(wrapperProps as any)}
            >
              <div
                className={`glass rounded-apex-lg p-6 border border-apex-border transition-colors ${
                  stat.href ? 'hover:border-apex-primary/30 cursor-pointer' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <stat.icon size={20} className={stat.color} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-apex-text-muted">{stat.label}</p>
              </div>
            </Wrapper>
          )
        })}
      </motion.div>

      {/* CTA principale */}
      <motion.div variants={itemVariants}>
        <Link href="/dashboard/consultation/new">
          <motion.div
            whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(26, 107, 255, 0.25)' }}
            whileTap={{ scale: 0.99 }}
            className="flex items-center justify-between p-6 rounded-apex-xl bg-apex-gradient cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Mic size={22} className="text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Nouvelle consultation</p>
                <p className="text-white/70 text-sm">
                  Commencer l&apos;enregistrement d&apos;une consultation
                </p>
              </div>
            </div>
            <ArrowRight
              size={20}
              className="text-white/70 group-hover:translate-x-1 transition-transform"
            />
          </motion.div>
        </Link>
      </motion.div>

      {/* Consultations récentes */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Consultations récentes</h2>
          <Link
            href="/dashboard/documents"
            className="text-sm text-apex-primary hover:underline flex items-center gap-1"
          >
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>

        <div className="glass rounded-apex-lg border border-apex-border overflow-hidden">
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-apex-surface-2 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-apex-text-muted" />
            </div>
            <p className="text-apex-text-muted text-sm mb-4">
              Aucune consultation pour l&apos;instant
            </p>
            <Link
              href="/dashboard/patients"
              className="inline-flex items-center gap-2 text-sm text-apex-primary hover:underline"
            >
              <Users size={14} />
              Ajouter votre premier patient
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Accès rapide */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/patients">
          <motion.div
            whileHover={{ y: -2 }}
            className="glass rounded-apex-lg p-5 border border-apex-border hover:border-apex-primary/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-apex bg-apex-primary/15 flex items-center justify-center">
                <Users size={16} className="text-apex-primary" />
              </div>
              <p className="font-medium text-white">Mes patients</p>
            </div>
            <p className="text-xs text-apex-text-muted">
              Gérer vos fiches patients • {patientCount} patient{patientCount !== 1 ? 's' : ''}
            </p>
          </motion.div>
        </Link>

        <Link href="/dashboard/documents">
          <motion.div
            whileHover={{ y: -2 }}
            className="glass rounded-apex-lg p-5 border border-apex-border hover:border-apex-secondary/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-apex bg-apex-secondary/15 flex items-center justify-center">
                <FileText size={16} className="text-apex-secondary" />
              </div>
              <p className="font-medium text-white">Mes documents</p>
            </div>
            <p className="text-xs text-apex-text-muted">
              Accéder à tous vos comptes rendus générés
            </p>
          </motion.div>
        </Link>
      </motion.div>

      {/* Shortcut hint */}
      <motion.div variants={itemVariants} className="text-center">
        <p className="text-xs text-apex-text-muted">
          Appuyez sur{' '}
          <kbd className="px-1.5 py-0.5 bg-apex-surface-2 rounded text-xs font-mono border border-apex-border">
            Ctrl+K
          </kbd>{' '}
          pour rechercher rapidement
        </p>
      </motion.div>
    </motion.div>
  )
}
