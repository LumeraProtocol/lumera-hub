'use client'

import './globals.css'
import React from 'react'
import { AppProvider } from '@lumera-hub/ui'
import { WebWalletProviders } from './providers/wallet-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <WebWalletProviders>{children}</WebWalletProviders>
        </AppProvider>
      </body>
    </html>
  )
}
