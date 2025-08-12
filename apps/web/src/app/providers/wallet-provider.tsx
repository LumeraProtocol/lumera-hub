'use client'

import React from 'react'
import { ChainProvider } from '@cosmos-kit/react'
import { chains as allChains, assets as allAssets } from 'chain-registry'
import { wallets as keplrWallets } from '@cosmos-kit/keplr-extension'
import { wallets as leapWallets } from '@cosmos-kit/leap-extension'
import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation-extension'
// import { wallets as walletconnectWallets } from '@cosmos-kit/walletconnect';
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'
import '@interchain-ui/react/styles'

// Declare only what you need to check for presence; no `any` necessary
declare global {
  interface Window {
    keplr?: unknown
    leap?: unknown
    cosmostation?: unknown
    __TAURI_INTERNALS__?: unknown
  }
}

const CHAIN_NAME = 'lumera'

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  const isWindow = typeof window !== 'undefined'
  const isTauri =
    isWindow &&
    (('__TAURI_INTERNALS__' in window) ||
      (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Tauri')))

  const isBrowser = typeof window !== 'undefined'

  const extensionWallets = [
    ...(isBrowser && window.keplr ? keplrWallets : []),
    ...(isBrowser && window.leap ? leapWallets : []),
    ...(isBrowser && window.cosmostation ? cosmostationWallets : []),
  ]

  // WalletConnect works across web, desktop (Tauri), and mobile
  // const baseWallets = [...walletconnectWallets]

  // const availableWallets = isBrowser
  //   ? [...extensionWallets, ...baseWallets]
  //   : baseWallets

  const availableWallets = [...extensionWallets]

  const chains = allChains.filter((c) => c.chain_name === CHAIN_NAME)
  const assets = allAssets.filter((a) => a.chain_name === CHAIN_NAME)

  return (
    <ThemeProvider>
      <ChainProvider
        chains={chains}
        assetLists={assets}
        wallets={availableWallets}
        // walletConnectOptions={{
        //   projectId: 'fd049c1154d0886fda615b1c2e08ee28',
        //   relayUrl: 'wss://relay.walletconnect.com',
        //   metadata: {
        //     name: 'Lumera Hub (testnet)',
        //     description: 'Lumera Hub (testnet)',
        //     url: 'https://hub.testnet.lumera.io',
        //     icons: ['https://portal.testnet.lumera.io/assets/logo-5cb73fc7.png'],
        //   },
        // }}
        throwErrors={false}
      >
        {children}
        <OverlaysManager />
      </ChainProvider>
    </ThemeProvider>
  )
}
