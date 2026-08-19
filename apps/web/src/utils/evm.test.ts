import { afterEach, describe, expect, it, vi } from 'vitest';
import { toBech32 } from '@cosmjs/encoding';

import type { Eip1193Provider } from '@/types/window';

vi.mock('@/contants/network', () => ({
  EVM_NATIVE_DECIMALS: 18,
  EVM_RPC_ENDPOINT: 'https://rpc.example.test',
}));

import {
  assertEvmAccountForChain,
  assertEvmProviderMatchesRpc,
  cosmosAddressToEvmAddress,
  evmAddressToCosmosAddress,
  evmBalanceToMicroLume,
  ensureEvmWalletNetwork,
  getEvmAccountForChain,
  getEvmBalance,
  getEvmConnectionErrorMessage,
  getEvmAddressFormats,
  getMetaMaskProvider,
  isEvmAddress,
  isEvmTransactionHash,
  normalizeEvmRecipientAddress,
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

describe('MetaMask connection errors', () => {
  it('explains browser and gateway failures as an RPC outage', () => {
    const expected = 'Lumera Testnet is temporarily unavailable. Your wallet is fine—please try again in a few minutes.';

    expect(getEvmConnectionErrorMessage(
      new TypeError('Failed to fetch'),
      'Lumera Testnet',
    )).toBe(expected);
    expect(getEvmConnectionErrorMessage(
      new Error('EVM RPC request failed with status 502.'),
      'Lumera Testnet',
    )).toBe(expected);
  });

  it('preserves wallet-specific errors such as user rejection', () => {
    expect(getEvmConnectionErrorMessage(
      new Error('User rejected the request.'),
      'Lumera Testnet',
    )).toBe('User rejected the request.');
  });
});

describe('EVM account address formats', () => {
  const bech32Address = 'lumera1qy352euf40x77qfrg4ncn27dauqjx3t83egcev';

  it('converts between the Bech32 and ETH hex representations', () => {
    expect(evmAddressToCosmosAddress(ADDRESS)).toBe(bech32Address);
    expect(cosmosAddressToEvmAddress(bech32Address)).toBe(ADDRESS);
  });

  it('returns both formats for either wallet mode on an EVM-enabled chain', () => {
    expect(getEvmAddressFormats(ADDRESS, true)).toEqual({
      bech32Address,
      ethAddress: ADDRESS,
    });
    expect(getEvmAddressFormats(bech32Address, true)).toEqual({
      bech32Address,
      ethAddress: ADDRESS,
    });
  });

  it('does not invent an ETH address on a non-EVM chain', () => {
    expect(getEvmAddressFormats(bech32Address, false)).toEqual({
      bech32Address,
      ethAddress: '',
    });
  });

  it('rejects malformed and non-account Bech32 values', () => {
    expect(() => cosmosAddressToEvmAddress('not-an-address'))
      .toThrow('invalid Bech32 address');
    expect(() => cosmosAddressToEvmAddress(toBech32('lumera', new Uint8Array([1]))))
      .toThrow('not 20 bytes');
  });

  it('normalizes Lumera Bech32 and EVM transaction recipients', () => {
    expect(normalizeEvmRecipientAddress(bech32Address)).toBe(ADDRESS);
    expect(normalizeEvmRecipientAddress(`  ${ADDRESS}  `)).toBe(ADDRESS);
  });

  it('rejects malformed and foreign-prefix transaction recipients', () => {
    const cosmosAddress = toBech32('cosmos', new Uint8Array(20));

    expect(() => normalizeEvmRecipientAddress('not-an-address'))
      .toThrow('valid lumera Bech32 or EVM recipient address');
    expect(() => normalizeEvmRecipientAddress(cosmosAddress))
      .toThrow('valid lumera Bech32 or EVM recipient address');
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

  it('accepts only full EVM transaction hashes', () => {
    expect(isEvmTransactionHash(`0x${'a1'.repeat(32)}`)).toBe(true);
    expect(isEvmTransactionHash(`0x${'a1'.repeat(31)}`)).toBe(false);
    expect(isEvmTransactionHash('not-a-hash')).toBe(false);
    expect(isEvmTransactionHash(null)).toBe(false);
  });

  it('converts an EVM account to its Lumera Bech32 representation', () => {
    expect(evmAddressToCosmosAddress(ADDRESS))
      .toBe('lumera1qy352euf40x77qfrg4ncn27dauqjx3t83egcev');
    expect(() => evmAddressToCosmosAddress('not-an-address')).toThrow('invalid EVM address');
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

describe('EVM RPC identity validation', () => {
  const createBlockProvider = (blockNumber: string, blockHash: string) => ({
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_blockNumber') return blockNumber;
      if (method === 'eth_getBlockByNumber') return { hash: blockHash };
      throw new Error(`Unexpected method ${method}`);
    }),
  }) as unknown as Eip1193Provider;

  it('accepts matching configured and MetaMask RPC chains', async () => {
    const requestRpc = vi.fn(async (method: string) => {
      if (method === 'eth_blockNumber') return '0x102';
      if (method === 'eth_getBlockByNumber') return { hash: '0xabc' };
      throw new Error(`Unexpected method ${method}`);
    });

    await expect(assertEvmProviderMatchesRpc(
      createBlockProvider('0x100', '0xAbC'),
      { requestRpc: requestRpc as never, rpcEndpoint: 'https://rpc.example.test' },
    )).resolves.toBeUndefined();
  });

  it('rejects a different network that reuses the configured chain ID', async () => {
    const requestRpc = vi.fn(async (method: string) => {
      if (method === 'eth_blockNumber') return '0x1000';
      throw new Error(`Unexpected method ${method}`);
    });

    await expect(assertEvmProviderMatchesRpc(
      createBlockProvider('0x100', '0xabc'),
      { requestRpc: requestRpc as never, rpcEndpoint: 'https://testnet.example.test' },
    )).rejects.toThrow('set the RPC URL to https://testnet.example.test');
  });

  it('rejects divergent block hashes when heights are close', async () => {
    const requestRpc = vi.fn(async (method: string) => {
      if (method === 'eth_blockNumber') return '0x100';
      if (method === 'eth_getBlockByNumber') return { hash: '0xdef' };
      throw new Error(`Unexpected method ${method}`);
    });

    await expect(assertEvmProviderMatchesRpc(
      createBlockProvider('0x100', '0xabc'),
      { requestRpc: requestRpc as never },
    )).rejects.toThrow('different Lumera network');
  });
});

describe('MetaMask network profile setup', () => {
  const options = {
    chainId: CHAIN_ID,
    chainName: 'lumera-testnet-evm',
    rpcEndpoint: 'https://evm-testnet.lumeraprotocol.com',
  };
  const matchingRpc = vi.fn(async (method: string) => {
    if (method === 'eth_blockNumber') return '0x100';
    if (method === 'eth_getBlockByNumber') return { hash: '0xtestnet' };
    throw new Error(`Unexpected method ${method}`);
  });

  it('suggests the named testnet profile when MetaMask does not know the chain', async () => {
    let activeChainId = '0x1';
    const provider = {
      request: vi.fn(async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === 'eth_chainId') return activeChainId;
        if (method === 'wallet_switchEthereumChain') {
          if (activeChainId === '0x1') {
            const error = new Error('Unrecognized chain') as Error & { code: number };
            error.code = 4902;
            throw error;
          }
          return null;
        }
        if (method === 'wallet_addEthereumChain') {
          const profile = params?.[0] as { chainId: string };
          activeChainId = profile.chainId;
          return null;
        }
        if (method === 'eth_blockNumber') return '0x100';
        if (method === 'eth_getBlockByNumber') return { hash: '0xtestnet' };
        throw new Error(`Unexpected method ${method}`);
      }),
    } as unknown as Eip1193Provider;

    await expect(ensureEvmWalletNetwork(provider, {
      ...options,
      requestRpc: matchingRpc as never,
      suggestProfileOnMismatch: true,
    })).resolves.toBeUndefined();

    expect(provider.request).toHaveBeenCalledWith({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x494c1a9',
        chainName: 'lumera-testnet-evm',
        nativeCurrency: { name: 'LUME', symbol: 'LUME', decimals: 18 },
        rpcUrls: ['https://evm-testnet.lumeraprotocol.com'],
      }],
    });
  });

  it('suggests testnet when an active devnet profile reuses its chain ID', async () => {
    let configuredTestnet = false;
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_chainId') return '0x494c1a9';
        if (method === 'eth_blockNumber') return configuredTestnet ? '0x100' : '0x1000';
        if (method === 'eth_getBlockByNumber') return { hash: '0xtestnet' };
        if (method === 'wallet_addEthereumChain') {
          configuredTestnet = true;
          return null;
        }
        if (method === 'wallet_switchEthereumChain') return null;
        throw new Error(`Unexpected method ${method}`);
      }),
    } as unknown as Eip1193Provider;

    await expect(ensureEvmWalletNetwork(provider, {
      ...options,
      requestRpc: matchingRpc as never,
      suggestProfileOnMismatch: true,
    })).resolves.toBeUndefined();

    expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'wallet_addEthereumChain',
    }));
  });

  it('does not open a profile prompt during background or pre-send validation', async () => {
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_chainId') return '0x494c1a9';
        if (method === 'eth_blockNumber') return '0x1000';
        throw new Error(`Unexpected method ${method}`);
      }),
    } as unknown as Eip1193Provider;

    await expect(ensureEvmWalletNetwork(provider, {
      ...options,
      requestRpc: matchingRpc as never,
    })).rejects.toThrow('different Lumera network');

    expect(provider.request).not.toHaveBeenCalledWith(expect.objectContaining({
      method: 'wallet_addEthereumChain',
    }));
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
