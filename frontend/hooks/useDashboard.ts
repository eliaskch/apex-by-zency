'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DashboardMetrics, RecentConsultation, Document } from '@/lib/types'

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const { data } = await api.get<DashboardMetrics>('/dashboard/metrics')
      return data
    },
  })
}

export function useRecentConsultations(limit: number = 10) {
  return useQuery<RecentConsultation[]>({
    queryKey: ['consultations', 'recent', limit],
    queryFn: async () => {
      const { data } = await api.get<RecentConsultation[]>(
        `/consultations/recent?limit=${limit}`
      )
      return data
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      consultationId,
      contentJson,
    }: {
      consultationId: string
      contentJson: Record<string, unknown>
    }) => {
      const { data } = await api.put<Document>(
        `/consultations/${consultationId}/document`,
        { content_json: contentJson }
      )
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.consultationId] })
      queryClient.invalidateQueries({ queryKey: ['consultations', 'recent'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] })
    },
  })
}
