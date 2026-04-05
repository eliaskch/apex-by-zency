'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  AlertTriangle,
  StickyNote,
  Pencil,
  Plus,
  Calendar,
  Trash2,
  Mic,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { usePatient, useDeletePatient } from '@/hooks/usePatients'
import { usePatientConsultations } from '@/hooks/useConsultation'
import { PatientDrawer } from '@/components/patient/PatientDrawer'
import { Button } from '@/components/ui/button'
import { formatDate, formatDuration, getInitials } from '@/lib/utils'
import type { ConsultationStatus } from '@/lib/types'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

/**
 * Génère une couleur HSL stable à partir de l'id du patient.
 */
function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 45%)`
}

/**
 * Calcule l'âge à partir d'une date de naissance ISO.
 */
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function genderLabel(g: string | null | undefined): string {
  if (g === 'M') return 'Homme'
  if (g === 'F') return 'Femme'
  if (g === 'autre') return 'Autre'
  return ''
}

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.id as string
  const { data: patient, isLoading } = usePatient(patientId)
  const deleteMutation = useDeletePatient()
  const { data: consultations } = usePatientConsultations(patientId)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const bgColor = useMemo(() => avatarColor(patientId), [patientId])
  const initials = patient ? getInitials(patient.first_name, patient.last_name) : ''
  const age = patient?.birth_date ? calculateAge(patient.birth_date) : null

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Left skeleton */}
          <div className="glass rounded-apex-xl border border-apex-border p-6 space-y-4">
            <div className="w-20 h-20 rounded-full bg-apex-surface-2 animate-pulse mx-auto" />
            <div className="h-6 bg-apex-surface-2 rounded animate-pulse w-3/4 mx-auto" />
            <div className="h-4 bg-apex-surface-2 rounded animate-pulse w-1/2 mx-auto" />
            <div className="space-y-3 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-apex-surface-2 rounded animate-pulse" />
              ))}
            </div>
          </div>
          {/* Right skeleton */}
          <div className="col-span-2 glass rounded-apex-xl border border-apex-border p-6">
            <div className="h-6 bg-apex-surface-2 rounded animate-pulse w-1/3 mb-6" />
            <div className="h-32 bg-apex-surface-2 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-apex-text-muted">Patient non trouvé</p>
        <Link href="/dashboard/patients" className="text-apex-primary hover:underline text-sm mt-2 inline-block">
          ← Retour à la liste
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Back link */}
      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center gap-2 text-sm text-apex-text-muted hover:text-apex-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Patients
        </Link>
      </motion.div>

      {/* 2-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column — Patient info */}
        <motion.div
          variants={itemVariants}
          className="glass rounded-apex-xl border border-apex-border p-6 space-y-6"
        >
          {/* Avatar + Identity */}
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: bgColor }}
            >
              {initials}
            </div>
            <h2 className="text-xl font-bold text-white">
              {patient.first_name} {patient.last_name.toUpperCase()}
            </h2>
            <p className="text-sm text-apex-text-muted mt-1">
              {age !== null && `${age} ans`}
              {age !== null && patient.gender && ' • '}
              {genderLabel(patient.gender)}
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            {patient.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={14} className="text-apex-text-muted shrink-0" />
                <span className="text-apex-text">{patient.phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail size={14} className="text-apex-text-muted shrink-0" />
                <span className="text-apex-text truncate">{patient.email}</span>
              </div>
            )}
            {patient.birth_date && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={14} className="text-apex-text-muted shrink-0" />
                <span className="text-apex-text">{formatDate(patient.birth_date)}</span>
              </div>
            )}
          </div>

          {/* Mutuelle */}
          {patient.mutual_name && (
            <div className="pt-3 border-t border-apex-border">
              <div className="flex items-center gap-3 text-sm">
                <Building2 size={14} className="text-apex-text-muted shrink-0" />
                <div>
                  <span className="text-apex-text">{patient.mutual_name}</span>
                  {patient.mutual_number && (
                    <span className="text-apex-text-muted ml-2 text-xs">
                      N° {patient.mutual_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Allergies */}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="pt-3 border-t border-apex-border">
              <div className="flex items-center gap-2 text-sm text-apex-text-muted mb-3">
                <AlertTriangle size={14} />
                <span className="font-medium">Allergies</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30"
                  >
                    <AlertTriangle size={10} />
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes médicales */}
          {patient.medical_notes && (
            <div className="pt-3 border-t border-apex-border">
              <div className="flex items-center gap-2 text-sm text-apex-text-muted mb-2">
                <StickyNote size={14} />
                <span className="font-medium">Notes</span>
              </div>
              <p className="text-sm text-apex-text leading-relaxed whitespace-pre-wrap">
                {patient.medical_notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-apex-border space-y-2">
            <Button
              variant="secondary"
              onClick={() => setDrawerOpen(true)}
              className="w-full"
            >
              <Pencil size={14} className="mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Êtes-vous sûr de vouloir archiver ce patient ?')) {
                  deleteMutation.mutate(patientId)
                }
              }}
              className="w-full"
              loading={deleteMutation.isPending}
            >
              <Trash2 size={14} className="mr-2" />
              Archiver
            </Button>
          </div>
        </motion.div>

        {/* Right column — Consultations */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 glass rounded-apex-xl border border-apex-border p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              Historique des consultations
            </h3>
            <Link href={`/dashboard/patients/${patientId}/consultation/new`}>
              <Button size="sm">
                <Plus size={14} className="mr-2" />
                Nouvelle consultation
              </Button>
            </Link>
          </div>

          {(!consultations || consultations.length === 0) ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-apex-surface-2 flex items-center justify-center mx-auto mb-4">
                <Calendar size={24} className="text-apex-text-muted" />
              </div>
              <p className="text-apex-text-muted text-sm mb-6">
                Aucune consultation pour l&apos;instant
              </p>
              <Link href={`/dashboard/patients/${patientId}/consultation/new`}>
                <Button>
                  <Mic size={16} className="mr-2" />
                  Démarrer une consultation
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => {
                const statusConfig: Record<ConsultationStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
                  idle: { label: 'En attente', color: 'text-apex-text-muted', icon: Calendar },
                  recording: { label: 'Enregistrement', color: 'text-red-400', icon: Mic },
                  uploading: { label: 'Upload', color: 'text-apex-primary', icon: Loader2 },
                  transcribing: { label: 'Transcription', color: 'text-amber-400', icon: Loader2 },
                  generating: { label: 'Génération IA', color: 'text-purple-400', icon: Loader2 },
                  done: { label: 'Terminée', color: 'text-apex-success', icon: CheckCircle2 },
                  error: { label: 'Erreur', color: 'text-apex-error', icon: AlertCircle },
                }
                const sc = statusConfig[c.status as ConsultationStatus] || statusConfig.idle
                const StatusIcon = sc.icon
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 p-4 rounded-apex bg-apex-surface-2/50 border border-apex-border/50 hover:border-apex-border transition-colors"
                  >
                    <div className={`shrink-0 ${sc.color}`}>
                      <StatusIcon size={18} className={c.status === 'transcribing' || c.status === 'generating' ? 'animate-spin' : ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white capitalize">{c.act_type.replace('_', ' ')}</p>
                      <p className="text-xs text-apex-text-muted">
                        {formatDate(c.recorded_at)}
                        {c.duration_seconds > 0 && ` · ${formatDuration(c.duration_seconds)}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Edit Drawer */}
      <PatientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        patient={patient}
      />
    </motion.div>
  )
}
