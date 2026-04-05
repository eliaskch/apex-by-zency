'use client'

import Link from 'next/link'
import { Mic, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewConsultationPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Nouvelle consultation</h1>
      <div className="glass rounded-apex-xl border border-apex-border p-12 text-center">
        <Mic size={32} className="text-apex-primary mx-auto mb-4" />
        <p className="text-white font-medium mb-2">
          Sélectionnez un patient pour démarrer
        </p>
        <p className="text-apex-text-muted text-sm mb-6">
          Choisissez un patient depuis la liste, puis lancez une consultation depuis sa fiche.
        </p>
        <Link href="/dashboard/patients">
          <Button>
            Voir les patients
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
