import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Paramètres</h1>
      <div className="glass rounded-apex-xl border border-apex-border p-12 text-center">
        <Settings size={32} className="text-apex-text-muted mx-auto mb-3" />
        <p className="text-apex-text-muted">
          Les paramètres du cabinet seront disponibles en Phase 5
        </p>
      </div>
    </div>
  )
}
