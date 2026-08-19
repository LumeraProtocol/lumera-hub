// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  wallet: {
    address: '0x1111111111111111111111111111111111111111',
    bech32Address: 'lumera1accounta',
    isEvm: true,
  },
}));

vi.mock('@/utils/api', () => ({ get: mocks.get }));
vi.mock('@/hooks/useWalletConnect', () => ({
  default: () => mocks.wallet,
}));

const { default: useTransaction } = await import('./useTransaction');

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const response = (txhash: string) => ({
  data: {
    total: '1',
    tx_responses: [{ txhash }],
  },
});

describe('useTransaction wallet changes', () => {
  beforeEach(() => {
    mocks.wallet.address = '0x1111111111111111111111111111111111111111';
    mocks.wallet.bech32Address = 'lumera1accounta';
    mocks.wallet.isEvm = true;
    mocks.get.mockReset();
  });

  it('does not let a previous wallet response replace the active wallet history', async () => {
    const accountA = deferred<ReturnType<typeof response>>();
    const accountB = deferred<ReturnType<typeof response>>();
    mocks.get.mockImplementation((path: string) => (
      path.includes('lumera1accounta') ? accountA.promise : accountB.promise
    ));

    const { result, rerender } = renderHook(() => useTransaction());
    await flush();
    mocks.wallet.address = '0x2222222222222222222222222222222222222222';
    mocks.wallet.bech32Address = 'lumera1accountb';
    rerender();
    await flush();

    accountB.resolve(response('B'));
    await flush();
    expect(result.current.transactions).toEqual([{ txhash: 'B' }]);
    expect(result.current.isLoading).toBe(false);

    accountA.resolve(response('A'));
    await flush();
    expect(result.current.transactions).toEqual([{ txhash: 'B' }]);
  });

  it('clears loading when a quiet refresh supersedes an initial request', async () => {
    const initial = deferred<ReturnType<typeof response>>();
    const refresh = deferred<ReturnType<typeof response>>();
    mocks.get
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(refresh.promise);

    const { result } = renderHook(() => useTransaction());
    await flush();
    expect(result.current.isLoading).toBe(true);

    let refreshed!: Promise<unknown>;
    act(() => {
      refreshed = result.current.refreshTransactions();
    });
    refresh.resolve(response('new'));
    await act(async () => {
      await refreshed;
    });

    expect(result.current.transactions).toEqual([{ txhash: 'new' }]);
    expect(result.current.isLoading).toBe(false);

    initial.resolve(response('old'));
    await flush();
    expect(result.current.transactions).toEqual([{ txhash: 'new' }]);
  });
});
