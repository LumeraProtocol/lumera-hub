import './globals.css'
import './styles.css'
import React from 'react'
import Script from 'next/script'
import ClientRoot from './providers/client-root'
import AppShell from '@/components/layout/AppShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
          <Script src="https://cdn.tailwindcss.com" />
      </head>
      <body>
        <ClientRoot>
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  )
}
