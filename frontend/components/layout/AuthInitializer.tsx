'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Composant client qui restaure la session auth au montage.
 * Appelé dans le layout dashboard pour que _accessToken soit valide
 * même après un page refresh (le token est en mémoire, pas en localStorage).
 * Déclenche le flux : GET /auth/me → 401 → POST /auth/refresh → retry.
 *
 * Ne se relance PAS si l'utilisateur est déjà authentifié (après login).
 */
export function AuthInitializer() {
  const { fetchMe, isAuthenticated } = useAuth()
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    // Si déjà authentifié (ex: vient de faire login), pas besoin de re-fetch
    if (!isAuthenticated) {
      fetchMe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
