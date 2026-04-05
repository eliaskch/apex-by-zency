import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { AuthInitializer } from '@/components/layout/AuthInitializer'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-apex-dark">
      <AuthInitializer />
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  )
}
