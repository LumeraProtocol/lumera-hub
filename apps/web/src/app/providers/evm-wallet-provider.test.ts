// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The default profile is mainnet, which has no EVM endpoints, so the wallet
// sync effect would bail out before any of this behaviour runs.
process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'testnet';

const mocks = vi.hoisted(() => ({
  getEvmAccountForChain: vi.fn(),
  assertEvmProviderMatchesRpc: vi.fn(),
  ensureEvmWalletNetwork: vi.fn(),
}));

vi.mock('@/utils/evm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/evm')>();
  return {
    ...actual,
    getEvmAccountForChain: mocks.getEvmAccountForChain,
    assertEvmProviderMatchesRpc: mocks.assertEvmProviderMatchesRpc,
    ensureEvmWalletNetwork: mocks.ensureEvmWalletNetwork,
  };
});

const { EvmAccountNotConnectedError, EvmNetworkMismatchError } = await import('@/utils/evm');
const { EvmWalletProvider, useEvmWallet } = await import('./evm-wallet-provider');

const ADDRESS_A = '0x1111111111111111111111111111111111111111';
const ADDRESS_B = '0x2222222222222222222222222222222222222222';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createFakeProvider = () => {
  const listeners = new Map<string, Array<() => void>>();
  return {
    isMetaMask: true,
    request: vi.fn(async () => undefined),
    on: (event: string, handler: () => void) => {
      listeners.set(event, [...(listeners.get(event) || []), handler]);
    },
    removeListener: (event: string, handler: () => void) => {
      listeners.set(event, (listeners.get(event) || []).filter((item) => item !== handler));
    },
    emit: (event: string) => {
      (listeners.get(event) || []).forEach((handler) => handler());
    },
  };
};

let fakeProvider: ReturnType<typeof createFakeProvider>;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(EvmWalletProvider, null, children);

const renderWallet = () => renderHook(() => useEvmWallet(), { wrapper });

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('EvmWalletProvider account sync', () => {
  beforeEach(() => {
    fakeProvider = createFakeProvider();
    (window as unknown as { ethereum: unknown }).ethereum = fakeProvider;
    mocks.getEvmAccountForChain.mockReset();
    mocks.assertEvmProviderMatchesRpc.mockReset();
    mocks.assertEvmProviderMatchesRpc.mockResolvedValue(undefined);
    mocks.ensureEvmWalletNetwork.mockReset();
    mocks.ensureEvmWalletNetwork.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete (window as unknown as { ethereum?: unknown }).ethereum;
  });

  it('ignores a superseded sync that resolves after a newer one', async () => {
    const slowSync = deferred<string>();
    const fastSync = deferred<string>();
    mocks.getEvmAccountForChain
      .mockReturnValueOnce(slowSync.promise)
      .mockReturnValueOnce(fastSync.promise);

    const { result } = renderWallet();
    await flush();

    // A wallet event starts a second sync while the first is still in flight.
    await act(async () => {
      fakeProvider.emit('accountsChanged');
    });

    // The newer sync resolves first and wins.
    fastSync.resolve(ADDRESS_B);
    await flush();
    expect(result.current.address).toBe(ADDRESS_B);

    // The older, slower sync must not clobber it on arrival.
    slowSync.resolve(ADDRESS_A);
    await flush();
    expect(result.current.address).toBe(ADDRESS_B);
  });

  it('keeps the connected address when verification fails transiently', async () => {
    mocks.getEvmAccountForChain.mockResolvedValue(ADDRESS_A);

    const { result } = renderWallet();
    await flush();
    expect(result.current.address).toBe(ADDRESS_A);

    mocks.assertEvmProviderMatchesRpc.mockRejectedValue(new Error('socket hang up'));
    await act(async () => {
      fakeProvider.emit('chainChanged');
    });
    await flush();

    expect(result.current.address).toBe(ADDRESS_A);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBe('socket hang up');
  });

  it('clears the address when the network genuinely mismatches', async () => {
    mocks.getEvmAccountForChain.mockResolvedValue(ADDRESS_A);

    const { result } = renderWallet();
    await flush();
    expect(result.current.address).toBe(ADDRESS_A);

    mocks.assertEvmProviderMatchesRpc.mockRejectedValue(
      new EvmNetworkMismatchError('MetaMask is connected to a different Lumera network.'),
    );
    await act(async () => {
      fakeProvider.emit('chainChanged');
    });
    await flush();

    expect(result.current.address).toBe('');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('MetaMask is connected to a different Lumera network.');
  });

  it('treats a passively discovered wallet with no authorized account as disconnected', async () => {
    mocks.getEvmAccountForChain.mockRejectedValue(
      new EvmAccountNotConnectedError(),
    );

    const { result } = renderWallet();
    await flush();

    expect(result.current.address).toBe('');
    expect(result.current.error).toBe('');
    expect(mocks.assertEvmProviderMatchesRpc).not.toHaveBeenCalled();
  });

  it('connects only after configuring and verifying the selected EVM profile', async () => {
    mocks.getEvmAccountForChain.mockResolvedValue(ADDRESS_A);
    const { result } = renderWallet();
    await flush();

    await act(async () => {
      await result.current.connect();
    });

    expect(fakeProvider.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(mocks.ensureEvmWalletNetwork).toHaveBeenCalledWith(
      fakeProvider,
      expect.objectContaining({
        chainId: 76857769,
        suggestProfileOnMismatch: true,
      }),
    );
    expect(result.current.address).toBe(ADDRESS_A);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('surfaces profile verification failures and leaves the wallet disconnected', async () => {
    mocks.getEvmAccountForChain.mockRejectedValue(
      new EvmAccountNotConnectedError(),
    );
    mocks.ensureEvmWalletNetwork.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderWallet();
    await flush();

    await act(async () => {
      await expect(result.current.connect()).rejects.toThrow('temporarily unavailable');
    });

    expect(result.current.address).toBe('');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toContain('temporarily unavailable');
  });

  it('clears local state even when permission revocation is unsupported', async () => {
    mocks.getEvmAccountForChain.mockResolvedValue(ADDRESS_A);
    const { result } = renderWallet();
    await flush();
    expect(result.current.address).toBe(ADDRESS_A);
    fakeProvider.request.mockRejectedValueOnce(new Error('unsupported method'));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(fakeProvider.request).toHaveBeenCalledWith({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    });
    expect(result.current.address).toBe('');
    expect(result.current.error).toBe('');
  });

  it('discovers MetaMask through an EIP-6963 provider announcement', async () => {
    delete (window as unknown as { ethereum?: unknown }).ethereum;
    mocks.getEvmAccountForChain.mockResolvedValue(ADDRESS_B);
    const announcedProvider = createFakeProvider();
    const { result } = renderWallet();
    await flush();
    expect(result.current.provider).toBeNull();

    await act(async () => {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: { provider: announcedProvider },
      }));
    });
    await flush();

    expect(result.current.provider).toBe(announcedProvider);
    expect(result.current.address).toBe(ADDRESS_B);
  });
});
