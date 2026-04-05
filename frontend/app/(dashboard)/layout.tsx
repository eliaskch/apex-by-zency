import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { AuthInitializer } from '@/components/layout/AuthInitializer'
import { AuthGuard } from '@/components/layout/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-apex-dark">
      <AuthInitializer />
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
