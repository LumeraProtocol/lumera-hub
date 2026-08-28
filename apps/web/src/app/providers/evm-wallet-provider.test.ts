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
const { EvmAccountNotConnectedError, EvmNetworkMismatchError } = await import('@/utils/evm');

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

const listeners = new Map<string, Array<() => void>>();
const emit = (event: string) => {
  listeners.get(event)?.forEach((listener) => listener());
};

describe('EvmWalletProvider stale sync protection', () => {
  beforeEach(() => {
    mocks.provider.request.mockReset().mockResolvedValue(undefined);
    mocks.provider.on.mockReset();
    mocks.provider.removeListener.mockReset();
    listeners.clear();
    mocks.provider.on.mockImplementation((event: string, listener: () => void) => {
      listeners.set(event, [...(listeners.get(event) || []), listener]);
    });
    mocks.provider.removeListener.mockImplementation((event: string, listener: () => void) => {
      listeners.set(event, (listeners.get(event) || []).filter((item) => item !== listener));
    });
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

  it('invalidates passive sync before permission revocation finishes', async () => {
    const slowAccountRead = deferred<string>();
    const slowRevocation = deferred<unknown>();
    mocks.getEvmAccountForChain.mockReturnValue(slowAccountRead.promise);
    mocks.provider.request.mockImplementation(({ method }: { method: string }) =>
      method === 'wallet_revokePermissions'
        ? slowRevocation.promise
        : Promise.resolve(undefined)
    );
    const { result } = renderHook(() => useEvmWallet(), { wrapper });

    await waitFor(() => expect(mocks.getEvmAccountForChain).toHaveBeenCalled());

    let disconnectPromise!: Promise<void>;
    act(() => {
      disconnectPromise = result.current.disconnect();
    });

    await act(async () => {
      slowAccountRead.resolve(ETH_ADDRESS);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Wallets commonly emit accountsChanged while revocation is pending. The
    // explicit disconnect intent must also suppress that newer passive read.
    act(() => emit('accountsChanged'));

    expect(result.current.address).toBe('');
    expect(result.current.isConnected).toBe(false);
    expect(mocks.getEvmAccountForChain).toHaveBeenCalledTimes(1);

    await act(async () => {
      slowRevocation.resolve(undefined);
      await disconnectPromise;
    });
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

  it('keeps the connected address when network verification fails transiently', async () => {
    mocks.getEvmAccountForChain.mockResolvedValue(ETH_ADDRESS);
    const { result } = renderHook(() => useEvmWallet(), { wrapper });
    await waitFor(() => expect(result.current.address).toBe(ETH_ADDRESS));

    mocks.assertEvmProviderMatchesRpc.mockRejectedValue(new Error('socket hang up'));
    act(() => emit('chainChanged'));

    await waitFor(() => expect(result.current.error).toBe('socket hang up'));
    expect(result.current.address).toBe(ETH_ADDRESS);
    expect(result.current.isConnected).toBe(true);
  });

  it('clears the connected address on a verified network mismatch', async () => {
    mocks.getEvmAccountForChain.mockResolvedValue(ETH_ADDRESS);
    const { result } = renderHook(() => useEvmWallet(), { wrapper });
    await waitFor(() => expect(result.current.address).toBe(ETH_ADDRESS));

    mocks.assertEvmProviderMatchesRpc.mockRejectedValue(
      new EvmNetworkMismatchError('MetaMask is connected to a different Lumera network.'),
    );
    act(() => emit('chainChanged'));

    await waitFor(() => expect(result.current.address).toBe(''));
    expect(result.current.error).toBe(
      'MetaMask is connected to a different Lumera network.',
    );
  });

  it('treats passive discovery without an authorized account as disconnected', async () => {
    mocks.getEvmAccountForChain.mockRejectedValue(new EvmAccountNotConnectedError());
    const { result } = renderHook(() => useEvmWallet(), { wrapper });

    await waitFor(() => expect(mocks.getEvmAccountForChain).toHaveBeenCalled());
    expect(result.current.address).toBe('');
    expect(result.current.error).toBe('');
    expect(mocks.assertEvmProviderMatchesRpc).not.toHaveBeenCalled();
  });

  it('connects only after configuring and verifying the EVM profile', async () => {
    mocks.getEvmAccountForChain
      .mockRejectedValueOnce(new EvmAccountNotConnectedError())
      .mockResolvedValue(ETH_ADDRESS);
    const { result } = renderHook(() => useEvmWallet(), { wrapper });
    await waitFor(() => expect(mocks.getEvmAccountForChain).toHaveBeenCalledTimes(1));

    await act(async () => result.current.connect());

    expect(mocks.provider.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(mocks.ensureEvmWalletNetwork).toHaveBeenCalledWith(
      mocks.provider,
      expect.objectContaining({ chainId: 76857769, suggestProfileOnMismatch: true }),
    );
    expect(result.current.address).toBe(ETH_ADDRESS);
    expect(result.current.error).toBe('');
  });
});
