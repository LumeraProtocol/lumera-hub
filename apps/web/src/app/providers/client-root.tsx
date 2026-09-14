'use client'

import React from 'react'
import UIAppProvider from './ui-app-provider'
import { NetworkProvider } from './network-provider'
import { WebWalletProviders } from './wallet-provider'
import HubProvider from './hub-provider'
import { ToastStack } from '@lumera-hub/ui/src/hub/Drawer'

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  // Once React has mounted, the app is live — reveal it and fade out the
  // first-load splash (see layout.tsx / #lm-splash in globals.css), then drop
  // the node after the transition.
  React.useEffect(() => {
    document.body.classList.add('app-ready')
    const splash = document.getElementById('lm-splash')
    if (!splash) return
    const t = window.setTimeout(() => splash.remove(), 600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <UIAppProvider>
      {/* NetworkProvider is above the wallet providers so it survives the
          remount it triggers when the network is switched. */}
      <NetworkProvider>
        <WebWalletProviders>
          {/* HubProvider sits inside the wallet providers because it reads the
              live signing address from them. */}
          <HubProvider>
            {children}
            <ToastStack />
          </HubProvider>
        </WebWalletProviders>
      </NetworkProvider>
    </UIAppProvider>
  )
}
