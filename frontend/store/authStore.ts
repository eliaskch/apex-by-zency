import { create } from 'zustand'
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
    // Stocker le token en mémoire via le module api
    import('@/lib/api').then(({ setAccessToken }) => setAccessToken(accessToken))
    set({ practitioner, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    import('@/lib/api').then(({ clearAccessToken }) => clearAccessToken())
    set({ practitioner: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))
