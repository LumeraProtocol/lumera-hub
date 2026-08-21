// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ETH_ADDRESS = '0x1111111111111111111111111111111111111111';

const mocks = vi.hoisted(() => ({
  provider: {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  getEvmAccountForChain: vi.fn(),
  assertEvmProviderMatchesRpc: vi.fn(),
  ensureEvmWalletNetwork: vi.fn(),
}));

vi.mock('@/contants/network', () => ({
  ACTIVE_NETWORK: { displayName: 'Lumera Testnet' },
  EVM_CHAIN_ID: 76857769,
  EVM_PROFILE_NAME: 'lumera-testnet-evm',
  EVM_RPC_ENDPOINT: 'https://evm.example.test',
  IS_EVM_NETWORK: true,
}));
vi.mock('@/utils/evm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/evm')>();
  return {
    ...actual,
    assertEvmProviderMatchesRpc: mocks.assertEvmProviderMatchesRpc,
    ensureEvmWalletNetwork: mocks.ensureEvmWalletNetwork,
    getEvmAccountForChain: mocks.getEvmAccountForChain,
    getMetaMaskProvider: () => mocks.provider,
  };
});

const { EvmWalletProvider, useEvmWallet } = await import('./evm-wallet-provider');

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(EvmWalletProvider, null, children);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe('EvmWalletProvider stale sync protection', () => {
  beforeEach(() => {
    mocks.provider.request.mockReset().mockResolvedValue(undefined);
    mocks.provider.on.mockReset();
    mocks.provider.removeListener.mockReset();
    mocks.assertEvmProviderMatchesRpc.mockReset().mockResolvedValue(undefined);
    mocks.ensureEvmWalletNetwork.mockReset().mockResolvedValue(undefined);
    mocks.getEvmAccountForChain.mockReset();
  });

  it('does not let an in-flight passive sync re-connect an explicitly disconnected wallet', async () => {
    // The mount-time passive sync stalls on its first RPC round trip…
    const slowAccountRead = deferred<string>();
    mocks.getEvmAccountForChain.mockReturnValue(slowAccountRead.promise);
    const { result } = renderHook(() => useEvmWallet(), { wrapper });

    await waitFor(() => expect(mocks.getEvmAccountForChain).toHaveBeenCalled());

    // …while the user explicitly disconnects.
    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.address).toBe('');

    // The stale sync finally resolves with the pre-revocation account. It
    // must not repopulate the address the user just disconnected.
    await act(async () => {
      slowAccountRead.resolve(ETH_ADDRESS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.address).toBe('');
    expect(result.current.isConnected).toBe(false);
  });

  it('does not let an in-flight passive sync clear an address connect() just set', async () => {
    // The mount-time sync stalls, then the user connects successfully.
    const slowAccountRead = deferred<string>();
    mocks.getEvmAccountForChain
      .mockReturnValueOnce(slowAccountRead.promise)
      .mockResolvedValue(ETH_ADDRESS);
    const { result } = renderHook(() => useEvmWallet(), { wrapper });

    await waitFor(() => expect(mocks.getEvmAccountForChain).toHaveBeenCalled());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.address).toBe(ETH_ADDRESS);

    // The stale mount-time sync fails afterwards (it read state from before
    // the user authorized the site). The fresh connection must survive.
    await act(async () => {
      slowAccountRead.reject(new Error('stale read'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.address).toBe(ETH_ADDRESS);
    expect(result.current.error).toBe('');
  });
});
