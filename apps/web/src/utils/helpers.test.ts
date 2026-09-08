import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalProfile = process.env.NEXT_PUBLIC_NETWORK_PROFILE;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_NETWORK_PROFILE;
  vi.resetModules();
});

afterEach(() => {
  if (originalProfile === undefined) delete process.env.NEXT_PUBLIC_NETWORK_PROFILE;
  else process.env.NEXT_PUBLIC_NETWORK_PROFILE = originalProfile;
  vi.resetModules();
});

describe('getChains', () => {
  it('returns only the configured Lumera testnet chain and assets', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'testnet';
    const { getChains } = await import('./helpers');

    const { chains, assetLists } = getChains();

    expect(chains).toHaveLength(1);
    expect(assetLists).toHaveLength(1);
    expect(chains[0]).toMatchObject({
      chainName: 'lumera-testnet',
      chainId: 'lumera-testnet-2',
    });
    // The configured host leads; community fallbacks follow it so a dead
    // primary does not block signing.
    expect(chains[0].apis?.rpc?.[0].address).toBe('https://lumera-testnet-rpc.polkachu.com');
    expect(chains[0].apis?.rest?.[0].address).toBe('https://lumera-testnet-api.polkachu.com');
    expect(chains[0].apis?.rpc?.length).toBeGreaterThan(1);
    expect(chains[0].apis?.rest?.length).toBeGreaterThan(1);
    expect(assetLists[0].chainName).toBe('lumera-testnet');
  });

  it('returns only the configured Lumera mainnet chain and assets', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'mainnet';
    const { getChains } = await import('./helpers');

    const { chains, assetLists } = getChains();

    expect(chains).toHaveLength(1);
    expect(assetLists).toHaveLength(1);
    expect(chains[0]).toMatchObject({
      chainName: 'lumera',
      chainId: 'lumera-mainnet-1',
    });
    expect(chains[0].apis?.rpc?.[0].address).toBe('https://lumera-rpc.polkachu.com');
    expect(chains[0].apis?.rest?.[0].address).toBe('https://lumera-api.polkachu.com');
    expect(chains[0].apis?.rpc?.length).toBeGreaterThan(1);
    expect(chains[0].apis?.rest?.length).toBeGreaterThan(1);
    expect(assetLists[0].chainName).toBe('lumera');
  });
});

describe('sumMicroLumeAmounts', () => {
  it('sums only micro-LUME denominated coins', async () => {
    const { sumMicroLumeAmounts } = await import('./helpers');

    expect(sumMicroLumeAmounts([
      { denom: 'ulume', amount: '100' },
      { denom: 'uatom', amount: '5' },
      { denom: 'ulume', amount: '23' },
    ])).toBe(123);
  });

  it('returns zero when there are no balances', async () => {
    const { sumMicroLumeAmounts } = await import('./helpers');

    expect(sumMicroLumeAmounts([])).toBe(0);
    expect(sumMicroLumeAmounts(undefined)).toBe(0);
  });
});
