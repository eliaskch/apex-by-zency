import { FileText } from 'lucide-react'

export default function DocumentsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Documents</h1>
      <div className="glass rounded-apex-xl border border-apex-border p-12 text-center">
        <FileText size={32} className="text-apex-text-muted mx-auto mb-3" />
        <p className="text-apex-text-muted">
          Les documents générés apparaîtront ici après vos consultations
        </p>
      </div>
    </div>
  )
}
