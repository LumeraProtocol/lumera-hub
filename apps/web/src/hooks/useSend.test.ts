// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ADDRESS_A = '0x1111111111111111111111111111111111111111';
const ADDRESS_B = '0x2222222222222222222222222222222222222222';
const RECIPIENT = '0x3333333333333333333333333333333333333333';
const TX_HASH = `0x${'ab'.repeat(32)}`;

const mocks = vi.hoisted(() => ({
  assertEvmAccountForChain: vi.fn(),
  ensureEvmNetwork: vi.fn(),
  getEvmBalance: vi.fn(),
  getClient: vi.fn(),
  providerRequest: vi.fn(),
  trackingHubTransaction: vi.fn(),
  wallet: {
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
    isEvm: true,
    evmProvider: null as null | { request: ReturnType<typeof vi.fn> },
  },
}));

vi.mock('@/contants/network', () => ({
  DENOM: 'ulume',
  EVM_CHAIN_ID: 76857769,
  EVM_NATIVE_DECIMALS: 18,
  EVM_RPC_ENDPOINT: 'https://rpc.example.test',
}));
vi.mock('@/hooks/useWalletConnect', () => ({
  default: () => ({
    ...mocks.wallet,
    ensureEvmNetwork: mocks.ensureEvmNetwork,
    getClient: mocks.getClient,
  }),
}));
vi.mock('@/hooks/useTrackingHubTransaction', () => ({
  default: () => ({ trackingHubTransaction: mocks.trackingHubTransaction }),
}));
vi.mock('@/utils/evm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/evm')>();
  return {
    ...actual,
    assertEvmAccountForChain: mocks.assertEvmAccountForChain,
    getEvmBalance: mocks.getEvmBalance,
  };
});

const { default: useSend } = await import('./useSend');

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

const enterTransfer = (
  result: { current: ReturnType<typeof useSend> },
  recipient = RECIPIENT,
) => {
  act(() => result.current.handleInputChange('amount', '1.25'));
  act(() => result.current.handleInputChange('recipient', recipient));
};

describe('useSend EVM transfers', () => {
  beforeEach(() => {
    mocks.wallet.address = ADDRESS_A;
    mocks.wallet.isConnected = true;
    mocks.wallet.isEvm = true;
    mocks.wallet.evmProvider = { request: mocks.providerRequest };
    mocks.assertEvmAccountForChain.mockReset();
    mocks.assertEvmAccountForChain.mockResolvedValue(ADDRESS_A);
    mocks.ensureEvmNetwork.mockReset();
    mocks.ensureEvmNetwork.mockResolvedValue(undefined);
    mocks.getClient.mockReset();
    mocks.getEvmBalance.mockReset();
    mocks.getEvmBalance.mockResolvedValue('0xde0b6b3a7640000');
    mocks.providerRequest.mockReset();
    mocks.providerRequest.mockResolvedValue(TX_HASH);
    mocks.trackingHubTransaction.mockReset();
  });

  it('verifies the network and active account before sending exact wei', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useSend({ callback }));
    await flush();
    enterTransfer(result);

    await act(async () => {
      await result.current.handleSendClick();
    });

    expect(mocks.ensureEvmNetwork).toHaveBeenCalledOnce();
    expect(mocks.assertEvmAccountForChain).toHaveBeenCalledWith(
      mocks.wallet.evmProvider,
      ADDRESS_A,
      76857769,
    );
    expect(mocks.providerRequest).toHaveBeenCalledWith({
      method: 'eth_sendTransaction',
      params: [{
        from: ADDRESS_A,
        to: RECIPIENT,
        value: '0x1158e460913d0000',
      }],
    });
    expect(mocks.ensureEvmNetwork.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.assertEvmAccountForChain.mock.invocationCallOrder[0]);
    expect(mocks.assertEvmAccountForChain.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.providerRequest.mock.invocationCallOrder[0]);
    expect(result.current.transactionHash).toBe(TX_HASH);
    expect(result.current.isLoading).toBe(false);
    expect(callback).toHaveBeenCalledWith(TX_HASH);
  });

  it('does not send after the active wallet account changes', async () => {
    mocks.assertEvmAccountForChain.mockRejectedValue(
      new Error('The active wallet account changed. Please retry the transaction.'),
    );
    const { result } = renderHook(() => useSend());
    await flush();
    enterTransfer(result);

    await act(async () => {
      await result.current.handleSendClick();
    });

    expect(mocks.providerRequest).not.toHaveBeenCalled();
    expect(result.current.error).toContain('active wallet account changed');
    expect(result.current.isLoading).toBe(false);
  });

  it('does not report success for a malformed provider transaction hash', async () => {
    mocks.providerRequest.mockResolvedValue('0x1234');
    const callback = vi.fn();
    const { result } = renderHook(() => useSend({ callback }));
    await flush();
    enterTransfer(result);

    await act(async () => {
      await result.current.handleSendClick();
    });

    expect(result.current.error).toBe('EVM wallet returned an invalid transaction hash.');
    expect(result.current.transactionHash).toBe('');
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not let a slower previous wallet balance overwrite the active wallet', async () => {
    const accountA = deferred<string>();
    const accountB = deferred<string>();
    mocks.getEvmBalance.mockImplementation((address: string) => (
      address === ADDRESS_A ? accountA.promise : accountB.promise
    ));

    const { result, rerender } = renderHook(() => useSend());
    await flush();
    mocks.wallet.address = ADDRESS_B;
    rerender();
    await flush();

    accountB.resolve('0x1bc16d674ec80000');
    await flush();
    expect(result.current.balances).toEqual([{ denom: 'ulume', amount: '2000000' }]);

    accountA.resolve('0xde0b6b3a7640000');
    await flush();
    expect(result.current.balances).toEqual([{ denom: 'ulume', amount: '2000000' }]);
  });
});
