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
}));

vi.mock('@/utils/evm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/evm')>();
  return {
    ...actual,
    getEvmAccountForChain: mocks.getEvmAccountForChain,
    assertEvmProviderMatchesRpc: mocks.assertEvmProviderMatchesRpc,
  };
});

const { EvmNetworkMismatchError } = await import('@/utils/evm');
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

  it('clears the address when the wallet reports no usable account', async () => {
    mocks.getEvmAccountForChain.mockRejectedValue(
      new Error('No EVM wallet account is connected.'),
    );

    const { result } = renderWallet();
    await flush();

    expect(result.current.address).toBe('');
    expect(result.current.error).toBe('No EVM wallet account is connected.');
    expect(mocks.assertEvmProviderMatchesRpc).not.toHaveBeenCalled();
  });
});
