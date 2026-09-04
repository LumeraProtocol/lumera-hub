'use client'

import React from 'react'
import UIAppProvider from './ui-app-provider'
import { WebWalletProviders } from './wallet-provider'
import HubProvider from './hub-provider'
import { ToastStack } from '@lumera-hub/ui/src/hub/Drawer'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <UIAppProvider>
      <WebWalletProviders>
        {/* HubProvider sits inside the wallet providers because it reads the
            live signing address from them. */}
        <HubProvider>
          {children}
          <ToastStack />
        </HubProvider>
      </WebWalletProviders>
    </UIAppProvider>
  )
}
