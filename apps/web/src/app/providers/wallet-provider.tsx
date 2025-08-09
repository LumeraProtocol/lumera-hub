'use client'

import React from 'react'
import { ChainProvider } from '@cosmos-kit/react'
import { chains as allChains, assets as allAssets } from 'chain-registry'
import { wallets as keplrWallets } from '@cosmos-kit/keplr-extension'
import { wallets as leapWallets } from '@cosmos-kit/leap-extension'
import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation-extension'
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'
import '@interchain-ui/react/styles'

// Declare only what you need to check for presence; no `any` necessary
declare global {
  interface Window {
    keplr?: unknown
    leap?: unknown
    cosmostation?: unknown
  }
}

const CHAIN_NAME = 'lumera'

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  const isBrowser = typeof window !== 'undefined'

  const availableWallets = [
    ...(isBrowser && window.keplr ? keplrWallets : []),
    ...(isBrowser && window.leap ? leapWallets : []),
    ...(isBrowser && window.cosmostation ? cosmostationWallets : []),
  ]

  const chains = allChains.filter((c) => c.chain_name === CHAIN_NAME)
  const assets = allAssets.filter((a) => a.chain_name === CHAIN_NAME)

  return (
    <ThemeProvider>
      <ChainProvider
        chains={chains}
        assetLists={assets}
        wallets={availableWallets}
        throwErrors={false}
      >
        {children}
        <OverlaysManager />
      </ChainProvider>
    </ThemeProvider>
  )
}
