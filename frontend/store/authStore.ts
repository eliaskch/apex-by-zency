import { create } from 'zustand'
import { setAccessToken, clearAccessToken } from '@/lib/api'
import type { Practitioner } from '@/lib/types'

interface AuthState {
  practitioner: Practitioner | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (practitioner: Practitioner, accessToken: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  practitioner: null,
  isAuthenticated: false,
  isLoading: true,

  login: (practitioner, accessToken) => {
    setAccessToken(accessToken)
    set({ practitioner, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    clearAccessToken()
    set({ practitioner: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))
