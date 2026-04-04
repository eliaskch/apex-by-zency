'use client'

/**
 * Hook principal d'authentification.
 * Expose : practitioner, isAuthenticated, isLoading, login(), logout(), register()
 */
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, setAccessToken, clearAccessToken } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { LoginPayload, RegisterPayload, Practitioner } from '@/lib/types'

export function useAuth() {
  const { practitioner, isAuthenticated, isLoading, login, logout: storeLogout, setLoading } =
    useAuthStore()
  const router = useRouter()

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      const { data } = await api.post<{ access_token: string }>('/auth/register', payload)
      setAccessToken(data.access_token)

      const { data: me } = await api.get<Practitioner>('/auth/me')
      login(me, data.access_token)
      router.push('/dashboard')
    },
    [login, router]
  )

  const loginUser = useCallback(
    async (payload: LoginPayload): Promise<void> => {
      const { data } = await api.post<{ access_token: string }>('/auth/login', payload)
      setAccessToken(data.access_token)

      const { data: me } = await api.get<Practitioner>('/auth/me')
      login(me, data.access_token)
      router.push('/dashboard')
    },
    [login, router]
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } finally {
      clearAccessToken()
      storeLogout()
      router.push('/login')
    }
  }, [storeLogout, router])

  const fetchMe = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const { data } = await api.get<Practitioner>('/auth/me')
      // On récupère le token depuis la mémoire (déjà stocké)
      const { getAccessToken } = await import('@/lib/api')
      login(data, getAccessToken() ?? '')
    } catch {
      storeLogout()
    } finally {
      setLoading(false)
    }
  }, [login, storeLogout, setLoading])

  return {
    practitioner,
    isAuthenticated,
    isLoading,
    register,
    login: loginUser,
    logout,
    fetchMe,
  }
}
