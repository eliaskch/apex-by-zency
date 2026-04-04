'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, Hexagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const { login, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    try {
      setServerError(null)
      await login(data)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Une erreur est survenue'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen bg-apex-dark flex items-center justify-center p-4">
      {/* Arrière-plan avec gradient subtil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-apex-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-apex-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="relative">
              <Hexagon className="w-10 h-10 text-apex-primary" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                A
              </span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight">APEX</h1>
              <p className="text-xs text-apex-text-muted -mt-1">by Zency</p>
            </div>
          </div>
          <p className="text-apex-text-muted text-sm">Comptes rendus médicaux par IA</p>
        </div>

        {/* Card glassmorphism */}
        <div className="glass rounded-apex-xl p-8 shadow-glass">
          <h2 className="text-xl font-semibold text-white mb-1">Connexion</h2>
          <p className="text-apex-text-muted text-sm mb-6">
            Accédez à votre espace praticien
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="dr.martin@cabinet.fr"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  className="pr-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-apex-text-muted hover:text-apex-text transition-colors"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-apex bg-apex-error/10 border border-apex-error/30 p-3 text-sm text-apex-error"
              >
                {serverError}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Se connecter
            </Button>
          </form>

          <p className="text-center text-sm text-apex-text-muted mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-apex-primary hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
