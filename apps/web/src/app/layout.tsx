import './globals.css'
import React from 'react'
import ClientRoot from './providers/client-root'
import AppShell from '@/components/layout/AppShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientRoot>
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  )
}
