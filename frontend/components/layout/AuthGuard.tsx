'use client'

import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Si on est certain que la session est vide après vérification
    if (!isLoading && !isAuthenticated) {
      console.warn("AuthGuard: Session expirée ou invalide. Redirection vers /login")
      // Éviter de push si on est déjà sur login (bien que protégé par le layout)
      if (!pathname.startsWith('/login')) {
        router.push(`/login?next=${pathname}`)
      }
    }
  }, [isLoading, isAuthenticated, router, pathname])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-apex-primary mb-4" size={32} />
        <p className="text-sm text-apex-text-muted animate-pulse">Chargement de votre espace...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
