'use client'

import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { WCWallet } from '@interchain-kit/core';
import { PersistGate } from 'redux-persist/integration/react';
import { ChainProvider } from '@interchain-kit/react';
import { keplrWallet } from '@interchain-kit/keplr-extension';
import { leapWallet } from '@interchain-kit/leap-extension';
import { cosmostationWallet } from '@interchain-kit/cosmostation-extension';
import { assetLists, chains } from 'chain-registry/testnet';
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react';
import '@interchain-ui/react/styles';

import {
  CHAIN_NAME,
  WALLET_CONNECT_PROJECTID,
  WALLET_CONNECT_RELAY_URL,
  WALLET_CONNECT_NAME,
  WALLET_CONNECT_DESCRIPTION,
  WALLET_CONNECT_URL,
  WALLET_CONNECT_ICON,
} from '@/contants/network';
import { RegistryProvider } from "./RegistryContext";
import store, { persistor } from '@/store';

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  const lumeraChain = chains.find(({chainName}) =>chainName === CHAIN_NAME)
  const lumeraAssets = assetLists.find(({chainName})=>chainName === CHAIN_NAME);

  if (!lumeraChain || !lumeraAssets) {
    throw new Error(`Chain or assets not found for ${CHAIN_NAME}`)
  }

  // Setup WalletConnect with custom metadata
  const walletConnect = React.useMemo(() => new WCWallet(undefined, {
    projectId: WALLET_CONNECT_PROJECTID,
    relayUrl: WALLET_CONNECT_RELAY_URL,
    metadata: {
      name: WALLET_CONNECT_NAME,
      description: WALLET_CONNECT_DESCRIPTION,
      url: WALLET_CONNECT_URL,
      icons: [WALLET_CONNECT_ICON],
    },
  }), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletAdapters: any = [keplrWallet, leapWallet, cosmostationWallet, walletConnect];

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <HelmetProvider>
          <ThemeProvider>
            <ChainProvider
              wallets={walletAdapters}
              chains={[lumeraChain]}
              assetLists={[lumeraAssets]}
            >
              <RegistryProvider>
                {children}
                <OverlaysManager />
              </RegistryProvider>
            </ChainProvider>
          </ThemeProvider>
        </HelmetProvider>
      </PersistGate>
    </Provider>
  )
}
