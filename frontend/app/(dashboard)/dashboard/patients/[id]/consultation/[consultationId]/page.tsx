'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { usePatient } from '@/hooks/usePatients'
import { useConsultation, useConsultationDocument } from '@/hooks/useConsultation'
import { useUpdateDocument } from '@/hooks/useDashboard'
import { getInitials, formatDate } from '@/lib/utils'

const FIELD_LABELS: Record<string, string> = {
  date: 'Date',
  motif: 'Motif de consultation',
  dent: 'Dent(s) concernée(s)',
  observations: 'Observations cliniques',
  diagnostic: 'Diagnostic',
  acte_realise: 'Acte réalisé',
  actes_realises: 'Actes réalisés',
  materiaux: 'Matériaux utilisés',
  anesthesie: 'Anesthésie',
  recommandations: 'Recommandations',
  prescriptions: 'Prescriptions',
  prochain_rdv: 'Prochain rendez-vous',
  notes: 'Notes',
  resume: 'Résumé',
  conclusion: 'Conclusion',
  antecedents: 'Antécédents',
  examen_clinique: 'Examen clinique',
  plan_traitement: 'Plan de traitement',
  bilan_parodontal: 'Bilan parodontal',
  indice_plaque: 'Indice de plaque',
  saignement: 'Saignement',
  mobilite: 'Mobilité',
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return Object.entries(item)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' — ')
        }
        return String(item)
      })
      .join('\n')
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
  }
  return String(value)
}

export default function ConsultationEditorPage() {
  const params = useParams()
  const patientId = params.id as string
  const consultationId = params.consultationId as string

  const { data: patient } = usePatient(patientId)
  const { data: consultation } = useConsultation(consultationId)
  const { data: document, isLoading: docLoading } = useConsultationDocument(consultationId)
  const updateDocument = useUpdateDocument()
  const { toast } = useToast()

  const [pdfKey, setPdfKey] = useState(0)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Build form from document JSON
  const contentJson = document?.content_json ?? {}
  const fields = Object.entries(contentJson)

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    values: Object.fromEntries(
      fields.map(([key, value]) => [key, renderValue(value)])
    ),
  })

  const onSubmit = async (formData: Record<string, string>) => {
    // Reconstruct JSON: try to preserve original types
    const reconstructed: Record<string, unknown> = {}
    for (const [key, formValue] of Object.entries(formData)) {
      const originalValue = contentJson[key]
      if (Array.isArray(originalValue)) {
        // Try to split by newlines
        reconstructed[key] = formValue.split('\n').filter(Boolean)
      } else if (typeof originalValue === 'number') {
        reconstructed[key] = Number(formValue) || formValue
      } else if (typeof originalValue === 'boolean') {
        reconstructed[key] = formValue === 'true'
      } else {
        reconstructed[key] = formValue
      }
    }

    try {
      await updateDocument.mutateAsync({
        consultationId,
        contentJson: reconstructed,
      })

      // Force PDF iframe reload
      setPdfKey((k) => k + 1)
      setSaveSuccess(true)
      toast('Document régénéré avec succès')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      toast('Erreur lors de la sauvegarde', 'error')
    }
  }

  if (docLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-apex-primary" size={32} />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <FileText size={48} className="text-apex-text-muted mx-auto mb-4" />
        <p className="text-apex-text-muted mb-2">Document non encore généré</p>
        <p className="text-xs text-apex-text-muted mb-4">
          Le pipeline IA est peut-être encore en cours de traitement.
        </p>
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="text-apex-primary hover:underline text-sm"
        >
          &larr; Retour au patient
        </Link>
      </div>
    )
  }

  const pdfUrl = document.pdf_url

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/patients/${patientId}`}
            className="inline-flex items-center gap-2 text-sm text-apex-text-muted hover:text-apex-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Retour
          </Link>
          {patient && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-apex-primary/15 flex items-center justify-center text-apex-primary text-[10px] font-bold">
                {getInitials(patient.first_name, patient.last_name)}
              </div>
              <span className="text-sm text-white font-medium">
                {patient.first_name} {patient.last_name.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-apex-text-muted">
          <span>Version {document.version}</span>
          <span>&middot;</span>
          <span>{formatDate(document.created_at)}</span>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left: Form editor */}
        <div className="glass rounded-apex-xl border border-apex-border overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-apex-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Édition du compte rendu</h3>
            {consultation && (
              <span className="text-[11px] text-apex-text-muted px-2 py-0.5 bg-apex-surface-2 rounded-full">
                {consultation.act_type}
              </span>
            )}
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {fields.map(([key]) => {
                const originalValue = contentJson[key]
                const isLong =
                  typeof originalValue === 'string' && originalValue.length > 80 ||
                  Array.isArray(originalValue) ||
                  typeof originalValue === 'object'

                return (
                  <div key={key}>
                    <label className="block text-xs font-medium text-apex-text-muted mb-1.5">
                      {getFieldLabel(key)}
                    </label>
                    {isLong ? (
                      <textarea
                        {...register(key)}
                        rows={4}
                        className="w-full rounded-apex bg-apex-surface border border-apex-border px-4 py-2.5 text-sm text-apex-text placeholder:text-apex-text-muted focus:outline-none focus:ring-2 focus:ring-apex-primary focus:border-transparent transition-all resize-y"
                      />
                    ) : (
                      <input
                        {...register(key)}
                        type="text"
                        className="flex h-11 w-full rounded-apex bg-apex-surface border border-apex-border px-4 py-2 text-sm text-apex-text placeholder:text-apex-text-muted focus:outline-none focus:ring-2 focus:ring-apex-primary focus:border-transparent transition-all"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Save button */}
            <div className="px-5 py-4 border-t border-apex-border">
              <Button
                type="submit"
                disabled={updateDocument.isPending || (!isDirty && !updateDocument.isPending)}
                className="w-full h-12 bg-apex-gradient hover:opacity-90 text-white font-semibold rounded-apex transition-all disabled:opacity-50"
              >
                {updateDocument.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Régénération du PDF...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 size={16} className="mr-2" />
                    Document régénéré avec succès
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Sauvegarder et régénérer le PDF
                  </>
                )}
              </Button>
              {updateDocument.isError && (
                <p className="mt-2 text-xs text-apex-error flex items-center gap-1">
                  <AlertCircle size={12} />
                  Erreur lors de la sauvegarde. Réessayez.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Right: PDF preview */}
        <div className="glass rounded-apex-xl border border-apex-border overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-apex-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Aperçu PDF</h3>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-apex-primary hover:underline"
              >
                Ouvrir dans un nouvel onglet
              </a>
            )}
          </div>

          <div className="flex-1 relative bg-apex-surface-2">
            {updateDocument.isPending && (
              <div className="absolute inset-0 bg-apex-dark/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="text-apex-primary animate-spin" />
                <p className="text-sm text-apex-text-muted">Régénération du PDF...</p>
              </div>
            )}

            {pdfUrl ? (
              <iframe
                key={pdfKey}
                src={pdfUrl}
                className="w-full h-full rounded-b-apex-xl"
                style={{ minHeight: '600px' }}
                title="Aperçu du compte rendu PDF"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <FileText size={48} className="text-apex-text-muted mb-4" />
                <p className="text-sm text-apex-text-muted">
                  PDF non disponible
                </p>
                <p className="text-xs text-apex-text-muted mt-1">
                  Sauvegardez pour générer le PDF
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
