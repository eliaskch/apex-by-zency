'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, Hexagon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

const step1Schema = z
  .object({
    first_name: z.string().min(1, 'Prénom requis'),
    last_name: z.string().min(1, 'Nom requis'),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Minimum 8 caractères'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm_password'],
  })

const step2Schema = z.object({
  cabinet_name: z.string().min(1, 'Nom du cabinet requis'),
  specialty: z.string().min(1, 'Spécialité requise'),
})

type Step1Form = z.infer<typeof step1Schema>
type Step2Form = z.infer<typeof step2Schema>

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  const colors = ['bg-apex-error', 'bg-apex-warning', 'bg-apex-warning', 'bg-apex-secondary']
  const labels = ['Faible', 'Moyen', 'Bon', 'Fort']

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-apex-surface-2'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-apex-text-muted mt-1">{labels[score - 1] ?? ''}</p>
    </div>
  )
}

const SPECIALTIES = [
  { value: 'dentaire', label: 'Chirurgie dentaire' },
  { value: 'generaliste', label: 'Médecine générale' },
  { value: 'kine', label: 'Kinésithérapie' },
]

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Form | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const { register: registerUser } = useAuth()

  const form1 = useForm<Step1Form>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { specialty: 'dentaire' },
  })

  const onStep1 = (data: Step1Form) => {
    setStep1Data(data)
    setStep(2)
  }

  const onStep2 = async (data: Step2Form) => {
    if (!step1Data) return
    try {
      setServerError(null)
      await registerUser({
        first_name: step1Data.first_name,
        last_name: step1Data.last_name,
        email: step1Data.email,
        password: step1Data.password,
        cabinet_name: data.cabinet_name,
        specialty: data.specialty,
      })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Une erreur est survenue'
      setServerError(message)
    }
  }

  const watchedPassword = form1.watch('password') ?? ''

  return (
    <div className="min-h-screen bg-apex-dark flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-apex-secondary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-apex-primary/10 rounded-full blur-3xl" />
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
        </div>

        <div className="glass rounded-apex-xl p-8 shadow-glass">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-apex-text-muted mb-2">
              <span>Étape {step} sur 2</span>
              <span>{step === 1 ? 'Informations personnelles' : 'Votre cabinet'}</span>
            </div>
            <div className="h-1 bg-apex-surface-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-apex-gradient rounded-full"
                initial={{ width: '50%' }}
                animate={{ width: step === 1 ? '50%' : '100%' }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">Créer votre compte</h2>
                <p className="text-apex-text-muted text-sm mb-6">Informations personnelles</p>

                <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="first_name">Prénom</Label>
                      <Input
                        id="first_name"
                        placeholder="Jean"
                        error={form1.formState.errors.first_name?.message}
                        {...form1.register('first_name')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Nom</Label>
                      <Input
                        id="last_name"
                        placeholder="Dupont"
                        error={form1.formState.errors.last_name?.message}
                        {...form1.register('last_name')}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email professionnel</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="dr.dupont@cabinet.fr"
                      error={form1.formState.errors.email?.message}
                      {...form1.register('email')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pr-11"
                        error={form1.formState.errors.password?.message}
                        {...form1.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-3 text-apex-text-muted hover:text-apex-text"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <PasswordStrength password={watchedPassword} />
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="••••••••"
                      error={form1.formState.errors.confirm_password?.message}
                      {...form1.register('confirm_password')}
                    />
                  </div>

                  <Button type="submit" className="w-full mt-2">
                    Continuer <ChevronRight size={16} className="ml-1" />
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">Votre cabinet</h2>
                <p className="text-apex-text-muted text-sm mb-6">
                  Dernière étape avant de commencer
                </p>

                <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
                  <div>
                    <Label htmlFor="cabinet_name">Nom du cabinet</Label>
                    <Input
                      id="cabinet_name"
                      placeholder="Cabinet Dentaire Dupont"
                      error={form2.formState.errors.cabinet_name?.message}
                      {...form2.register('cabinet_name')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="specialty">Spécialité</Label>
                    <select
                      id="specialty"
                      className="flex h-11 w-full rounded-apex bg-apex-surface border border-apex-border px-4 py-2 text-sm text-apex-text focus:outline-none focus:ring-2 focus:ring-apex-primary transition-all"
                      {...form2.register('specialty')}
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
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

                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep(1)}
                      className="flex-none"
                    >
                      <ChevronLeft size={16} className="mr-1" /> Retour
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      loading={form2.formState.isSubmitting}
                    >
                      Créer mon compte
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-apex-text-muted mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-apex-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
