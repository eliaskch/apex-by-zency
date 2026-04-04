import { Users } from 'lucide-react'

export default function PatientsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Patients</h1>
      <div className="glass rounded-apex-xl border border-apex-border p-12 text-center">
        <Users size={32} className="text-apex-text-muted mx-auto mb-3" />
        <p className="text-apex-text-muted">
          La gestion des patients sera disponible en Phase 2
        </p>
      </div>
    </div>
  )
}
