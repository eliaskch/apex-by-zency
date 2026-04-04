import { Mic } from 'lucide-react'

export default function NewConsultationPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Nouvelle consultation</h1>
      <div className="glass rounded-apex-xl border border-apex-border p-12 text-center">
        <Mic size={32} className="text-apex-text-muted mx-auto mb-3" />
        <p className="text-apex-text-muted">
          L&apos;enregistrement audio sera disponible en Phase 3
        </p>
      </div>
    </div>
  )
}
