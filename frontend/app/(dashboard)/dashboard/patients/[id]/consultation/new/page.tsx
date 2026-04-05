'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Mic,
  Square,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { usePatient } from '@/hooks/usePatients'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useConsultationSocket } from '@/hooks/useConsultationSocket'
import {
  useCreateConsultation,
  useUploadAudio,
} from '@/hooks/useConsultation'
import { formatDuration, getInitials } from '@/lib/utils'
import type { ConsultationStatus } from '@/lib/types'

const ACT_TYPES = [
  { value: 'bilan', label: 'Bilan / Examen clinique' },
  { value: 'carie', label: 'Soin carie / Obturation' },
  { value: 'endodontie', label: 'Traitement endodontique' },
  { value: 'extraction', label: 'Extraction dentaire' },
  { value: 'detartrage', label: 'Détartrage / Prophylaxie' },
  { value: 'prothese', label: 'Prothèse fixe (couronne / bridge)' },
  { value: 'urgence', label: 'Urgence dentaire' },
]

const STATUS_CONFIG: Record<
  ConsultationStatus,
  { label: string; icon: typeof Mic; color: string; bgColor: string }
> = {
  idle: { label: 'Prêt', icon: Mic, color: 'text-apex-text-muted', bgColor: 'bg-apex-surface-2' },
  recording: { label: 'Enregistrement en cours...', icon: Mic, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  uploading: { label: 'Upload en cours...', icon: Upload, color: 'text-apex-primary', bgColor: 'bg-apex-primary/10' },
  transcribing: { label: 'Transcription en cours...', icon: Loader2, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  generating: { label: "Génération de l'IA...", icon: Sparkles, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  done: { label: 'Compte rendu prêt !', icon: CheckCircle2, color: 'text-apex-success', bgColor: 'bg-apex-success/10' },
  error: { label: 'Une erreur est survenue', icon: AlertCircle, color: 'text-apex-error', bgColor: 'bg-apex-error/10' },
}

function WaveformBars({ volume }: { volume: number }) {
  const bars = 24
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: bars }).map((_, i) => {
        const distance = Math.abs(i - bars / 2) / (bars / 2)
        const baseHeight = 0.15
        const targetHeight = Math.max(baseHeight, (1 - distance * 0.6) * (volume / 100))
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-apex-primary to-apex-secondary"
            animate={{ scaleY: targetHeight }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{ height: '100%', transformOrigin: 'center' }}
          />
        )
      })}
    </div>
  )
}

function ProgressBar({ progress, status }: { progress: number; status: ConsultationStatus }) {
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.icon

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <StatusIcon
          size={20}
          className={`${config.color} ${status === 'transcribing' || status === 'generating' ? 'animate-spin' : ''}`}
        />
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>
      <div className="w-full max-w-md mx-auto h-2 rounded-full bg-apex-surface-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-apex-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-apex-text-muted text-center">{progress}%</p>
    </div>
  )
}

export default function NewConsultationPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string

  const { data: patient, isLoading: patientLoading } = usePatient(patientId)
  const recorder = useAudioRecorder()
  const socket = useConsultationSocket()
  const createConsultation = useCreateConsultation()
  const uploadAudioMutation = useUploadAudio()

  const [actType, setActType] = useState('bilan')
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Statut combiné : local (idle/recording) ou via WebSocket (uploading+)
  const currentStatus: ConsultationStatus = useMemo(() => {
    if (recorder.isRecording) return 'recording'
    if (uploadAudioMutation.isPending) return 'uploading'
    if (socket.status !== 'idle') return socket.status
    return 'idle'
  }, [recorder.isRecording, uploadAudioMutation.isPending, socket.status])

  const progress = useMemo(() => {
    if (currentStatus === 'uploading') return uploadProgress
    return socket.progress
  }, [currentStatus, uploadProgress, socket.progress])

  // Redirection automatique vers l'éditeur quand c'est done
  useEffect(() => {
    if (currentStatus === 'done' && consultationId) {
      const timer = setTimeout(() => {
        router.push(`/dashboard/patients/${patientId}/consultation/${consultationId}`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentStatus, consultationId, patientId, router])

  const [serverError, setServerError] = useState<string | null>(null)

  const handleStartRecording = useCallback(async () => {
    setServerError(null)
    try {
      // 1. Créer la consultation côté backend
      const consultation = await createConsultation.mutateAsync({
        patient_id: patientId,
        act_type: actType,
        specialty: 'dentaire',
      })
      setConsultationId(consultation.id)

      // 2. Connecter le WebSocket
      socket.connect(consultation.id)

      // 3. Démarrer l'enregistrement audio
      await recorder.start()
    } catch (err: any) {
      console.error("Erreur démarrage consultation:", err)
      const detail = err?.response?.data?.detail
      setServerError(detail || "Impossible d'initialiser la consultation. Vérifiez votre connexion au serveur.")
    }
  }, [patientId, actType, createConsultation, socket, recorder])

  const handleStopRecording = useCallback(async () => {
    if (!consultationId) return

    // 1. Arrêter l'enregistrement
    const audioBlob = await recorder.stop()

    // 2. Uploader l'audio
    await uploadAudioMutation.mutateAsync({
      consultationId,
      audioBlob,
      onProgress: setUploadProgress,
    })
  }, [consultationId, recorder, uploadAudioMutation])

  if (patientLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-apex-primary" size={32} />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-apex-text-muted">Patient non trouvé</p>
        <Link
          href="/dashboard/patients"
          className="text-apex-primary hover:underline text-sm mt-2 inline-block"
        >
          &larr; Retour
        </Link>
      </div>
    )
  }

  const config = STATUS_CONFIG[currentStatus]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="inline-flex items-center gap-2 text-sm text-apex-text-muted hover:text-apex-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Retour au patient
        </Link>
      </div>

      {/* Patient badge */}
      <div className="glass rounded-apex-xl border border-apex-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-apex-primary/20 flex items-center justify-center text-apex-primary font-bold">
            {getInitials(patient.first_name, patient.last_name)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {patient.first_name} {patient.last_name.toUpperCase()}
            </h2>
            <p className="text-sm text-apex-text-muted">Nouvelle consultation</p>
          </div>
        </div>
      </div>

      {/* Act type selector — only when idle */}
      <AnimatePresence mode="wait">
        {currentStatus === 'idle' && (
          <motion.div
            key="act-selector"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass rounded-apex-xl border border-apex-border p-6"
          >
            <label className="block text-sm font-medium text-apex-text-muted mb-3">
              Type d&apos;acte
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACT_TYPES.map((act) => (
                <button
                  key={act.value}
                  onClick={() => setActType(act.value)}
                  className={`text-left px-4 py-3 rounded-apex text-sm transition-all ${
                    actType === act.value
                      ? 'bg-apex-primary/15 text-apex-primary border border-apex-primary/30 ring-1 ring-apex-primary/20'
                      : 'bg-apex-surface-2 text-apex-text-muted border border-transparent hover:bg-apex-surface-2/80 hover:text-apex-text'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main recording area */}
      <motion.div
        layout
        className="glass rounded-apex-xl border border-apex-border p-8"
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}
          >
            {currentStatus === 'recording' && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse-slow" />
            )}
            <config.icon
              size={16}
              className={
                currentStatus === 'transcribing' || currentStatus === 'generating'
                  ? 'animate-spin'
                  : ''
              }
            />
            {config.label}
          </div>

          {/* Recording state */}
          <AnimatePresence mode="wait">
            {currentStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center space-y-6"
              >
                <button
                  onClick={handleStartRecording}
                  disabled={createConsultation.isPending}
                  className="w-24 h-24 rounded-full bg-apex-gradient flex items-center justify-center
                             shadow-apex-glow hover:shadow-[0_0_60px_rgba(26,107,255,0.3)]
                             transition-shadow duration-300 disabled:opacity-50"
                >
                  {createConsultation.isPending ? (
                    <Loader2 size={36} className="text-white animate-spin" />
                  ) : (
                    <Mic size={36} className="text-white" />
                  )}
                </button>
                <p className="text-apex-text-muted text-sm">
                  Appuyez pour démarrer l&apos;enregistrement
                </p>
              </motion.div>
            )}

            {currentStatus === 'recording' && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center space-y-6 w-full"
              >
                {/* Timer */}
                <div className="text-4xl font-mono text-white font-bold tracking-wider">
                  {formatDuration(recorder.duration)}
                </div>

                {/* Waveform */}
                <WaveformBars volume={recorder.volume} />

                {/* Stop button */}
                <button
                  onClick={handleStopRecording}
                  className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400
                             flex items-center justify-center hover:bg-red-500/30
                             transition-colors duration-200"
                >
                  <Square size={28} className="text-red-400" fill="currentColor" />
                </button>
                <p className="text-apex-text-muted text-sm">
                  Appuyez pour terminer l&apos;acte
                </p>
              </motion.div>
            )}

            {(currentStatus === 'uploading' ||
              currentStatus === 'transcribing' ||
              currentStatus === 'generating') && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full py-4"
              >
                <ProgressBar progress={progress} status={currentStatus} />
              </motion.div>
            )}

            {currentStatus === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                >
                  <CheckCircle2 size={64} className="text-apex-success" />
                </motion.div>
                <p className="text-white font-medium">Compte rendu généré avec succès !</p>
                <p className="text-apex-text-muted text-sm">
                  Redirection en cours...
                </p>
              </motion.div>
            )}

            {currentStatus === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-4"
              >
                <AlertCircle size={48} className="text-apex-error" />
                <p className="text-apex-error text-sm">
                  Une erreur est survenue pendant le traitement.
                </p>
                <Button
                  onClick={() => {
                    setConsultationId(null)
                    socket.disconnect()
                  }}
                >
                  Réessayer
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error from recorder or api */}
      {(recorder.error || serverError) && (
        <motion.div
           // @ts-ignore: AnimatePresence requires keys which is fine here
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-apex border border-apex-error/30 bg-apex-error/5 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-apex-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-apex-error font-medium">Erreur</p>
              <p className="text-xs text-apex-text-muted mt-1">{recorder.error || serverError}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
