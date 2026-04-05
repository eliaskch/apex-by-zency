'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Composant client qui restaure la session auth au montage.
 * Appelé dans le layout dashboard pour que _accessToken soit valide
 * même après un page refresh (le token est en mémoire, pas en localStorage).
 * Déclenche le flux : GET /auth/me → 401 → POST /auth/refresh → retry.
 */
export function AuthInitializer() {
  const { fetchMe } = useAuth()

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return null
}
