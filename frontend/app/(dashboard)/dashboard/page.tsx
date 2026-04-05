'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Mic,
  Users,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  Pencil,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useDashboardMetrics, useRecentConsultations } from '@/hooks/useDashboard'
import { formatDate } from '@/lib/utils'
import type { ConsultationStatus } from '@/lib/types'

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

const ACT_LABELS: Record<string, string> = {
  bilan: 'Bilan',
  carie: 'Carie',
  endodontie: 'Endodontie',
  extraction: 'Extraction',
  detartrage: 'Détartrage',
  prothese: 'Prothèse',
  urgence: 'Urgence',
}

const STATUS_BADGES: Record<ConsultationStatus, { label: string; color: string }> = {
  idle: { label: 'En attente', color: 'text-apex-text-muted bg-apex-surface-2' },
  recording: { label: 'Enregistrement', color: 'text-red-400 bg-red-500/10' },
  uploading: { label: 'Upload', color: 'text-apex-primary bg-apex-primary/10' },
  transcribing: { label: 'Transcription', color: 'text-amber-400 bg-amber-500/10' },
  generating: { label: 'Génération', color: 'text-purple-400 bg-purple-500/10' },
  done: { label: 'Terminé', color: 'text-apex-success bg-apex-success/10' },
  error: { label: 'Erreur', color: 'text-apex-error bg-apex-error/10' },
}

function formatTimeSaved(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function MetricSkeleton() {
  return (
    <div className="glass rounded-apex-lg p-6 border border-apex-border">
      <div className="w-5 h-5 bg-apex-surface-2 rounded animate-pulse mb-3" />
      <div className="w-16 h-8 bg-apex-surface-2 rounded animate-pulse mb-1" />
      <div className="w-24 h-4 bg-apex-surface-2 rounded animate-pulse" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-apex-surface-2 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="w-32 h-3 bg-apex-surface-2 rounded animate-pulse" />
            <div className="w-20 h-2.5 bg-apex-surface-2 rounded animate-pulse" />
          </div>
          <div className="w-16 h-5 bg-apex-surface-2 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const practitioner = useAuthStore((s) => s.practitioner)
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics()
  const { data: recentConsultations, isLoading: recentLoading } = useRecentConsultations(10)

  const today = formatDate(new Date())

  const STATS = [
    {
      label: 'Patients',
      value: metrics ? String(metrics.patients_count) : '—',
      icon: Users,
      color: 'text-apex-primary',
      href: '/dashboard/patients',
    },
    {
      label: 'Consultations ce mois',
      value: metrics ? String(metrics.consultations_count) : '—',
      icon: Mic,
      color: 'text-apex-secondary',
      href: undefined,
    },
    {
      label: 'Documents générés',
      value: metrics ? String(metrics.documents_count) : '—',
      icon: FileText,
      color: 'text-apex-accent',
      href: undefined,
    },
    {
      label: 'Temps économisé',
      value: metrics ? formatTimeSaved(metrics.time_saved_minutes) : '—',
      icon: Clock,
      color: 'text-apex-text-muted',
      href: undefined,
    },
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
          Bonjour Dr {practitioner?.last_name ?? ''}
        </h1>
        <p className="text-apex-text-muted mt-1">{today}</p>
      </motion.div>

      {/* Statistiques */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricsLoading
          ? [1, 2, 3, 4].map((i) => <MetricSkeleton key={i} />)
          : STATS.map((stat) => {
              const card = (
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
              )
              return stat.href ? (
                <Link key={stat.label} href={stat.href}>{card}</Link>
              ) : (
                <div key={stat.label}>{card}</div>
              )
            })}
      </motion.div>

      {/* CTA nouvelle consultation */}
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
          {recentLoading ? (
            <TableSkeleton />
          ) : !recentConsultations || recentConsultations.length === 0 ? (
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
          ) : (
            <div className="divide-y divide-apex-border">
              {recentConsultations.map((c) => {
                const statusBadge = STATUS_BADGES[c.status]
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-apex-surface-2/50 transition-colors"
                  >
                    {/* Patient initials */}
                    <div className="w-9 h-9 rounded-full bg-apex-primary/15 flex items-center justify-center text-apex-primary text-xs font-bold shrink-0">
                      {c.patient.first_name.charAt(0)}
                      {c.patient.last_name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {c.patient.first_name} {c.patient.last_name.toUpperCase()}
                      </p>
                      <p className="text-xs text-apex-text-muted">
                        {ACT_LABELS[c.act_type] ?? c.act_type} &middot;{' '}
                        {formatDate(c.recorded_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusBadge.color}`}
                    >
                      {c.status === 'done' && <CheckCircle2 size={12} />}
                      {c.status === 'error' && <AlertCircle size={12} />}
                      {(c.status === 'transcribing' || c.status === 'generating') && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      {c.status === 'generating' && <Sparkles size={12} />}
                      {statusBadge.label}
                    </span>

                    {/* Actions */}
                    {c.status === 'done' && c.has_document && (
                      <div className="flex items-center gap-1">
                        {c.pdf_url && (
                          <a
                            href={c.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-apex text-apex-text-muted hover:text-white hover:bg-apex-surface-2 transition-colors"
                            title="Voir le PDF"
                          >
                            <Eye size={15} />
                          </a>
                        )}
                        <Link
                          href={`/dashboard/patients/${c.patient_id}/consultation/${c.id}`}
                          className="p-2 rounded-apex text-apex-text-muted hover:text-apex-primary hover:bg-apex-primary/10 transition-colors"
                          title="Éditer"
                        >
                          <Pencil size={15} />
                        </Link>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Accès rapide */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Gérer vos fiches patients &bull;{' '}
              {metrics ? `${metrics.patients_count} patient${metrics.patients_count !== 1 ? 's' : ''}` : '...'}
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
