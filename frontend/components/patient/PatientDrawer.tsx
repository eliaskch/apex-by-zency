'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ChevronDown, Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreatePatient, useUpdatePatient } from '@/hooks/usePatients'
import type { Patient } from '@/lib/types/patient'

const patientSchema = z.object({
  last_name: z.string().min(1, 'Le nom est requis'),
  first_name: z.string().min(1, 'Le prénom est requis'),
  birth_date: z.string().optional().nullable(),
  gender: z.enum(['M', 'F', 'autre']).optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email invalide').optional().or(z.literal('')).nullable(),
  mutual_name: z.string().optional().nullable(),
  mutual_number: z.string().optional().nullable(),
  allergies: z.array(z.string()).optional(),
  medical_notes: z.string().optional().nullable(),
})

type PatientFormData = z.infer<typeof patientSchema>

interface PatientDrawerProps {
  open: boolean
  onClose: () => void
  patient?: Patient | null
}

export function PatientDrawer({ open, onClose, patient }: PatientDrawerProps) {
  const isEdit = !!patient
  const createMutation = useCreatePatient()
  const updateMutation = useUpdatePatient(patient?.id ?? '')
  const [medicalOpen, setMedicalOpen] = useState(false)
  const [allergyInput, setAllergyInput] = useState('')

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      last_name: '',
      first_name: '',
      birth_date: '',
      gender: null,
      phone: '',
      email: '',
      mutual_name: '',
      mutual_number: '',
      allergies: [],
      medical_notes: '',
    },
  })

  const allergies = watch('allergies') ?? []

  useEffect(() => {
    if (patient && open) {
      reset({
        last_name: patient.last_name,
        first_name: patient.first_name,
        birth_date: patient.birth_date ?? '',
        gender: (patient.gender as 'M' | 'F' | 'autre') ?? null,
        phone: patient.phone ?? '',
        email: patient.email ?? '',
        mutual_name: patient.mutual_name ?? '',
        mutual_number: patient.mutual_number ?? '',
        allergies: patient.allergies ?? [],
        medical_notes: patient.medical_notes ?? '',
      })
      if (patient.mutual_name || patient.allergies?.length || patient.medical_notes) {
        setMedicalOpen(true)
      }
    } else if (!patient && open) {
      reset({
        last_name: '',
        first_name: '',
        birth_date: '',
        gender: null,
        phone: '',
        email: '',
        mutual_name: '',
        mutual_number: '',
        allergies: [],
        medical_notes: '',
      })
      setMedicalOpen(false)
    }
  }, [patient, open, reset])

  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergies.includes(trimmed)) {
      setValue('allergies', [...allergies, trimmed])
    }
    setAllergyInput('')
  }

  const removeAllergy = (idx: number) => {
    setValue(
      'allergies',
      allergies.filter((_, i) => i !== idx)
    )
  }

  const onSubmit = async (data: PatientFormData) => {
    try {
      // Clean empty strings to null
      const cleaned = {
        ...data,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        phone: data.phone || null,
        email: data.email || null,
        mutual_name: data.mutual_name || null,
        mutual_number: data.mutual_number || null,
        medical_notes: data.medical_notes || null,
        allergies: data.allergies ?? [],
      }

      if (isEdit) {
        await updateMutation.mutateAsync(cleaned)
      } else {
        await createMutation.mutateAsync(cleaned)
      }
      onClose()
    } catch {
      // error handled by mutation
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-apex-surface border-l border-apex-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-apex-border">
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? 'Modifier le patient' : 'Nouveau patient'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-apex text-apex-text-muted hover:text-white hover:bg-apex-surface-2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {/* Nom & Prénom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="drawer-last-name">Nom *</Label>
                  <Input
                    id="drawer-last-name"
                    placeholder="Dupont"
                    error={errors.last_name?.message}
                    {...register('last_name')}
                  />
                </div>
                <div>
                  <Label htmlFor="drawer-first-name">Prénom *</Label>
                  <Input
                    id="drawer-first-name"
                    placeholder="Jean"
                    error={errors.first_name?.message}
                    {...register('first_name')}
                  />
                </div>
              </div>

              {/* Date de naissance */}
              <div>
                <Label htmlFor="drawer-birth-date">Date de naissance</Label>
                <Input
                  id="drawer-birth-date"
                  type="date"
                  {...register('birth_date')}
                />
              </div>

              {/* Genre */}
              <div>
                <Label htmlFor="drawer-gender">Genre</Label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="drawer-gender"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="flex h-11 w-full rounded-apex bg-apex-surface border border-apex-border px-4 py-2 text-sm text-apex-text focus:outline-none focus:ring-2 focus:ring-apex-primary focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Non précisé</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                      <option value="autre">Autre</option>
                    </select>
                  )}
                />
              </div>

              {/* Téléphone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="drawer-phone">Téléphone</Label>
                  <Input
                    id="drawer-phone"
                    placeholder="06 12 34 56 78"
                    {...register('phone')}
                  />
                </div>
                <div>
                  <Label htmlFor="drawer-email">Email</Label>
                  <Input
                    id="drawer-email"
                    type="email"
                    placeholder="jean@email.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
              </div>

              {/* Section Médicale — Accordéon */}
              <div className="border border-apex-border rounded-apex-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMedicalOpen(!medicalOpen)}
                  className="w-full flex items-center justify-between p-4 text-sm font-medium text-apex-text-muted hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Informations médicales
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${medicalOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {medicalOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-4 border-t border-apex-border">
                        {/* Mutuelle */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="drawer-mutual-name">Mutuelle</Label>
                            <Input
                              id="drawer-mutual-name"
                              placeholder="AXA Santé"
                              {...register('mutual_name')}
                            />
                          </div>
                          <div>
                            <Label htmlFor="drawer-mutual-number">N° mutuelle</Label>
                            <Input
                              id="drawer-mutual-number"
                              placeholder="123456789"
                              {...register('mutual_number')}
                            />
                          </div>
                        </div>

                        {/* Allergies — Tags Input */}
                        <div>
                          <Label>Allergies</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              value={allergyInput}
                              onChange={(e) => setAllergyInput(e.target.value)}
                              placeholder="Ajouter une allergie..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addAllergy()
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              onClick={addAllergy}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          {allergies.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {allergies.map((allergy, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30"
                                >
                                  <AlertTriangle size={10} />
                                  {allergy}
                                  <button
                                    type="button"
                                    onClick={() => removeAllergy(idx)}
                                    className="ml-1 hover:text-white transition-colors"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Notes médicales */}
                        <div>
                          <Label htmlFor="drawer-medical-notes">Notes médicales</Label>
                          <textarea
                            id="drawer-medical-notes"
                            rows={3}
                            placeholder="Notes importantes sur le patient..."
                            className="flex w-full rounded-apex bg-apex-surface border border-apex-border px-4 py-3 text-sm text-apex-text placeholder:text-apex-text-muted focus:outline-none focus:ring-2 focus:ring-apex-primary focus:border-transparent transition-all duration-200 resize-none"
                            {...register('medical_notes')}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-apex-border flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={onClose} type="button">
                Annuler
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                {isEdit ? 'Enregistrer' : 'Créer le patient →'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
