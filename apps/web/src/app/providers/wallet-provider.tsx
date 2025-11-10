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
import { getChains } from '@/utils/helpers';
import { RegistryProvider } from "./RegistryContext";
import store, { persistor } from '@/store';

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  const { chains, assetLists } = getChains();
  const isBrowser = typeof window !== 'undefined';

  // Resolve chain & assets only in the browser to avoid throwing during Next.js prerender/export
  // Use loose typing to avoid importing chain-registry types; runtime values come from the registry data.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chainData, setChainData] = React.useState<{ chain: any; assets: any } | null>(null);

  React.useEffect(() => {
    if (!isBrowser) return;
    const foundChain = chains.find(({ chainName }) => chainName === CHAIN_NAME);
    const foundAssets = assetLists.find(({ chainName }) => chainName === CHAIN_NAME);

    if (!foundChain || !foundAssets) {
      console.warn(
        `Chain or assets not found for ${CHAIN_NAME}. Available chains: ${chains
          .map((c) => c.chainName)
          .join(', ')}`
      );
      return;
    }
    setChainData({ chain: foundChain, assets: foundAssets });
  }, [isBrowser]);

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
            <RegistryProvider>
              {isBrowser && chainData ? (
                <ChainProvider wallets={walletAdapters} chains={[chainData.chain]} assetLists={[chainData.assets]}>
                  {children}
                  <OverlaysManager />
                </ChainProvider>
              ) : (
                // During SSR or while resolving on client, render app shell without ChainProvider to avoid build-time throws
                <>
                  {children}
                </>
              )}
            </RegistryProvider>
          </ThemeProvider>
        </HelmetProvider>
      </PersistGate>
    </Provider>
  )
}
