import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'APEX by Zency — Comptes rendus médicaux par IA',
  description: 'Générez vos comptes rendus médicaux en quelques secondes grâce à l\'IA.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="bg-apex-dark text-apex-text min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
