'use client'

import React from 'react'
import UIAppProvider from './ui-app-provider'
import { WebWalletProviders } from './wallet-provider'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <UIAppProvider>
      <WebWalletProviders>{children}</WebWalletProviders>
    </UIAppProvider>
  )
}
