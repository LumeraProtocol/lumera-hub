'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  ACTIVE_NETWORK,
  EVM_CHAIN_ID,
  EVM_RPC_ENDPOINT,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { getEvmAccountForChain, getMetaMaskProvider, toHexChainId } from '@/utils/evm';
import type { Eip1193Provider } from '@/types/window';

interface EvmProviderError extends Error {
  code?: number;
}

interface Eip6963ProviderDetail {
  provider?: Eip1193Provider;
}

interface EvmWalletContextValue {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  provider: Eip1193Provider | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  ensureNetwork: () => Promise<void>;
}

const EvmWalletContext = createContext<EvmWalletContextValue | null>(null);

export function EvmWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState('');
  const [isConnecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<Eip1193Provider | null>(
    typeof window === 'undefined' ? null : getMetaMaskProvider(window.ethereum)
  );

  useEffect(() => {
    const detectProvider = () => {
      const detectedProvider = getMetaMaskProvider(window.ethereum);
      setProvider((currentProvider) => detectedProvider || currentProvider);
    };
    const handleProviderAnnouncement = (event: Event) => {
      const announcedProvider = getMetaMaskProvider(
        (event as CustomEvent<Eip6963ProviderDetail>).detail?.provider
      );
      if (announcedProvider) setProvider(announcedProvider);
    };

    detectProvider();
    window.addEventListener('ethereum#initialized', detectProvider, { once: true });
    window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => {
      window.removeEventListener('ethereum#initialized', detectProvider);
      window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement);
    };
  }, []);

  const ensureNetwork = useCallback(async () => {
    if (!IS_EVM_NETWORK || !EVM_CHAIN_ID || !EVM_RPC_ENDPOINT) {
      throw new Error('The active network does not support EVM wallets.');
    }
    if (!provider) {
      throw new Error('MetaMask was not detected. Install or enable the MetaMask extension.');
    }

    const chainId = toHexChainId(EVM_CHAIN_ID);
    const currentChainId = await provider.request<string>({ method: 'eth_chainId' });
    if (currentChainId.toLowerCase() === chainId.toLowerCase()) return;

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (switchError) {
      const typedError = switchError as EvmProviderError;
      if (typedError.code !== 4902) throw switchError;

      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId,
          chainName: ACTIVE_NETWORK.displayName,
          nativeCurrency: {
            name: 'Lumera',
            symbol: 'LUME',
            decimals: 18,
          },
          rpcUrls: [EVM_RPC_ENDPOINT],
        }],
      });
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    }

    const activeChainId = await provider.request<string>({ method: 'eth_chainId' });
    if (activeChainId.toLowerCase() !== chainId.toLowerCase()) {
      throw new Error(`Wallet did not switch to ${ACTIVE_NETWORK.displayName}.`);
    }
  }, [provider]);

  const connect = useCallback(async () => {
    setError('');
    setConnecting(true);
    try {
      if (!provider) {
        throw new Error('MetaMask was not detected. Install or enable the MetaMask extension.');
      }
      await provider.request<string[]>({ method: 'eth_requestAccounts' });
      await ensureNetwork();
      if (!EVM_CHAIN_ID) {
        throw new Error('The active network does not define an EVM chain ID.');
      }
      setAddress(await getEvmAccountForChain(provider, EVM_CHAIN_ID));
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : 'Unable to connect EVM wallet.';
      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [ensureNetwork, provider]);

  const disconnect = useCallback(async () => {
    try {
      await provider?.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Some injected wallets do not implement permission revocation.
    }
    setAddress('');
    setError('');
  }, [provider]);

  useEffect(() => {
    if (!IS_EVM_NETWORK || !provider || !EVM_CHAIN_ID) return;
    const expectedChainId = EVM_CHAIN_ID;

    const syncAccounts = async () => {
      try {
        setAddress(await getEvmAccountForChain(provider, expectedChainId));
      } catch {
        setAddress('');
      }
    };

    const handleAccountsChanged = () => void syncAccounts();
    const handleChainChanged = () => void syncAccounts();

    void syncAccounts();
    provider.on?.('accountsChanged', handleAccountsChanged);
    provider.on?.('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [provider]);

  const value = useMemo<EvmWalletContextValue>(() => ({
    address,
    isConnected: Boolean(address),
    isConnecting,
    error,
    provider,
    connect,
    disconnect,
    ensureNetwork,
  }), [address, connect, disconnect, ensureNetwork, error, isConnecting, provider]);

  return <EvmWalletContext.Provider value={value}>{children}</EvmWalletContext.Provider>;
}

export const useEvmWallet = () => {
  const context = useContext(EvmWalletContext);
  if (!context) {
    throw new Error('useEvmWallet must be used within EvmWalletProvider.');
  }
  return context;
};
