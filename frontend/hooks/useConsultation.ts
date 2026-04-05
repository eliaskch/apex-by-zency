'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api, uploadAudio } from '@/lib/api'
import type {
  Consultation,
  ConsultationCreate,
  ConsultationListItem,
  Document,
} from '@/lib/types'

export function useCreateConsultation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ConsultationCreate) => {
      const response = await api.post<Consultation>('/consultations', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
    },
  })
}

export function useConsultation(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      const response = await api.get<Consultation>(`/consultations/${consultationId}`)
      return response.data
    },
    enabled: !!consultationId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      // Poll tant que la consultation n'est pas terminée
      if (data.status === 'done' || data.status === 'error') return false
      return 3000
    },
  })
}

export function usePatientConsultations(patientId: string | undefined) {
  return useQuery({
    queryKey: ['consultations', patientId],
    queryFn: async () => {
      const response = await api.get<ConsultationListItem[]>(
        `/consultations?patient_id=${patientId}`
      )
      return response.data
    },
    enabled: !!patientId,
  })
}

export function useUploadAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      consultationId,
      audioBlob,
      onProgress,
    }: {
      consultationId: string
      audioBlob: Blob
      onProgress?: (percent: number) => void
    }) => {
      return await uploadAudio(consultationId, audioBlob, onProgress)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['consultation', variables.consultationId],
      })
    },
  })
}

export function useConsultationDocument(consultationId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['document', consultationId],
    queryFn: async () => {
      const response = await api.get<Document>(`/consultations/${consultationId}/document`)
      return response.data
    },
    enabled: !!consultationId && enabled,
  })
}
