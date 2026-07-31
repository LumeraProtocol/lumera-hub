'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  ACTIVE_NETWORK,
  EVM_CHAIN_ID,
  EVM_RPC_ENDPOINT,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { toHexChainId } from '@/utils/evm';
import type { Eip1193Provider } from '@/types/window';

interface EvmProviderError extends Error {
  code?: number;
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
  const provider = typeof window === 'undefined' ? null : window.ethereum || null;

  const ensureNetwork = useCallback(async () => {
    if (!IS_EVM_NETWORK || !EVM_CHAIN_ID || !EVM_RPC_ENDPOINT) {
      throw new Error('The active network does not support EVM wallets.');
    }
    if (!provider) {
      throw new Error('No EVM wallet was detected. Install MetaMask or another compatible wallet.');
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
    }
  }, [provider]);

  const connect = useCallback(async () => {
    setError('');
    setConnecting(true);
    try {
      if (!provider) {
        throw new Error('No EVM wallet was detected. Install MetaMask or another compatible wallet.');
      }
      const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
      await ensureNetwork();
      setAddress(accounts[0] || '');
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
        const [accounts, chainId] = await Promise.all([
          provider.request<string[]>({ method: 'eth_accounts' }),
          provider.request<string>({ method: 'eth_chainId' }),
        ]);
        setAddress(
          chainId.toLowerCase() === toHexChainId(expectedChainId).toLowerCase()
            ? accounts[0] || ''
            : ''
        );
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
