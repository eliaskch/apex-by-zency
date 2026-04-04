'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type {
  Patient,
  PatientCreate,
  PatientUpdate,
  PatientListResponse,
  PatientSearchResult,
} from '@/lib/types/patient'

const PATIENTS_KEY = 'patients'

/**
 * Liste paginée des patients avec recherche.
 */
export function usePatients(search?: string, page: number = 0, limit: number = 20) {
  return useQuery<PatientListResponse>({
    queryKey: [PATIENTS_KEY, { search, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('skip', String(page * limit))
      params.set('limit', String(limit))
      const { data } = await api.get<PatientListResponse>(`/patients?${params.toString()}`)
      return data
    },
  })
}

/**
 * Fiche patient complète.
 */
export function usePatient(id: string | undefined) {
  return useQuery<Patient>({
    queryKey: [PATIENTS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Patient>(`/patients/${id}`)
      return data
    },
    enabled: !!id,
  })
}

/**
 * Créer un patient.
 */
export function useCreatePatient() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: PatientCreate) => {
      const { data } = await api.post<Patient>('/patients', payload)
      return data
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] })
      router.push(`/dashboard/patients/${patient.id}`)
    },
  })
}

/**
 * Mettre à jour un patient.
 */
export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: PatientUpdate) => {
      const { data } = await api.put<Patient>(`/patients/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] })
    },
  })
}

/**
 * Soft delete un patient.
 */
export function useDeletePatient() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patients/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PATIENTS_KEY] })
      router.push('/dashboard/patients')
    },
  })
}

/**
 * Recherche autocomplete patients.
 */
export function useSearchPatients(query: string) {
  return useQuery<PatientSearchResult[]>({
    queryKey: [PATIENTS_KEY, 'search', query],
    queryFn: async () => {
      const { data } = await api.get<PatientSearchResult[]>(
        `/patients/search?q=${encodeURIComponent(query)}`
      )
      return data
    },
    enabled: query.length >= 2,
  })
}
