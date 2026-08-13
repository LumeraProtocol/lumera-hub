import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Eip1193Provider } from '@/types/window';

vi.mock('@/contants/network', () => ({
  EVM_NATIVE_DECIMALS: 18,
  EVM_RPC_ENDPOINT: 'https://rpc.example.test',
}));

import {
  assertEvmAccountForChain,
  evmBalanceToMicroLume,
  getEvmAccountForChain,
  getEvmBalance,
  getMetaMaskProvider,
  isEvmAddress,
  parseEvmAmount,
  requestEvmRpc,
  toHexChainId,
} from './evm';

const ADDRESS = '0x0123456789abcdef0123456789abcdef01234567';
const CHAIN_ID = 76857769;

const createProvider = (accounts = [ADDRESS], chainId = toHexChainId(CHAIN_ID)) => ({
  request: vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_accounts') return accounts;
    if (method === 'eth_chainId') return chainId;
    throw new Error(`Unexpected method ${method}`);
  }),
}) as unknown as Eip1193Provider;

describe('MetaMask provider selection', () => {
  it('finds MetaMask in a multi-provider browser', () => {
    const keplrProvider = { request: vi.fn(), isMetaMask: false } as unknown as Eip1193Provider;
    const metaMaskProvider = { request: vi.fn(), isMetaMask: true } as unknown as Eip1193Provider;
    const aggregateProvider = {
      request: vi.fn(),
      providers: [keplrProvider, metaMaskProvider],
    } as unknown as Eip1193Provider;

    expect(getMetaMaskProvider(aggregateProvider)).toBe(metaMaskProvider);
  });

  it('accepts a direct MetaMask provider and rejects other injected providers', () => {
    const metaMaskProvider = { request: vi.fn(), isMetaMask: true } as unknown as Eip1193Provider;
    const otherProvider = { request: vi.fn() } as unknown as Eip1193Provider;

    expect(getMetaMaskProvider(metaMaskProvider)).toBe(metaMaskProvider);
    expect(getMetaMaskProvider(otherProvider)).toBeNull();
    expect(getMetaMaskProvider()).toBeNull();
  });

  it('falls back to an aggregate provider that identifies itself as MetaMask', () => {
    const otherProvider = { request: vi.fn() } as unknown as Eip1193Provider;
    const aggregateMetaMask = {
      request: vi.fn(),
      isMetaMask: true,
      providers: [otherProvider],
    } as unknown as Eip1193Provider;

    expect(getMetaMaskProvider(aggregateMetaMask)).toBe(aggregateMetaMask);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EVM value helpers', () => {
  it('validates addresses without accepting malformed values', () => {
    expect(isEvmAddress(ADDRESS)).toBe(true);
    expect(isEvmAddress(`${ADDRESS}00`)).toBe(false);
    expect(isEvmAddress('lumera1abc')).toBe(false);
  });

  it('converts decimal LUME amounts to exact wei hex values', () => {
    expect(parseEvmAmount('1')).toBe('0xde0b6b3a7640000');
    expect(parseEvmAmount('0.000000000000000001')).toBe('0x1');
    expect(parseEvmAmount('1.25', 2)).toBe('0x7d');
  });

  it.each(['0', '-1', '1e3', '1.0000000000000000001'])(
    'rejects invalid amount %s',
    (amount) => expect(() => parseEvmAmount(amount)).toThrow()
  );

  it('rejects invalid token decimal metadata', () => {
    expect(() => parseEvmAmount('1', -1)).toThrow('non-negative integer');
    expect(() => parseEvmAmount('1', 1.5)).toThrow('non-negative integer');
  });

  it('converts wei balances to the existing micro-LUME display unit', () => {
    expect(evmBalanceToMicroLume('0xde0b6b3a7640000')).toBe('1000000');
    expect(evmBalanceToMicroLume('0xe8d4a50fff')).toBe('0');
  });

  it('rejects malformed RPC balance quantities', () => {
    expect(() => evmBalanceToMicroLume('not-a-quantity')).toThrow('invalid balance');
    expect(() => evmBalanceToMicroLume('-1')).toThrow('invalid balance');
  });
});

describe('EVM account validation', () => {
  it('returns the connected account only on the expected chain', async () => {
    await expect(getEvmAccountForChain(createProvider(), CHAIN_ID)).resolves.toBe(ADDRESS);
  });

  it('rejects the wrong chain and missing accounts', async () => {
    await expect(getEvmAccountForChain(createProvider([ADDRESS], '0x1'), CHAIN_ID)).rejects.toThrow(
      'different network'
    );
    await expect(getEvmAccountForChain(createProvider([]), CHAIN_ID)).rejects.toThrow(
      'No EVM wallet account'
    );
  });

  it('detects an account change before sending', async () => {
    await expect(
      assertEvmAccountForChain(createProvider(), '0x1111111111111111111111111111111111111111', CHAIN_ID)
    ).rejects.toThrow('active wallet account changed');
  });
});

describe('requestEvmRpc', () => {
  it('posts a JSON-RPC request and returns its result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x2a' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestEvmRpc<string>('eth_blockNumber')).resolves.toBe('0x2a');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://rpc.example.test',
      expect.objectContaining({ method: 'POST' })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
    });
  });

  it('surfaces HTTP, RPC, and malformed-response failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(requestEvmRpc('eth_blockNumber')).rejects.toThrow('status 503');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { code: -32000, message: 'upstream failure' } }),
    }));
    await expect(requestEvmRpc('eth_blockNumber')).rejects.toThrow('upstream failure');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));
    await expect(requestEvmRpc('eth_blockNumber')).rejects.toThrow('returned no result');
  });
});

describe('getEvmBalance', () => {
  it('validates the address before making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(getEvmBalance('invalid')).rejects.toThrow('invalid EVM address');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed balance result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: null }),
    }));
    await expect(getEvmBalance(ADDRESS)).rejects.toThrow('invalid balance');
  });
});
