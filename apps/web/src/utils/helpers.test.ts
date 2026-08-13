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
      apis: {
        rpc: [{ address: 'https://rpc-testnet.lumeraprotocol.com' }],
        rest: [{ address: 'https://lcd-testnet.lumeraprotocol.com' }],
      },
    });
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
      apis: {
        rpc: [{ address: 'https://rpc.lumera.io' }],
        rest: [{ address: 'https://lcd.lumera.io' }],
      },
    });
    expect(assetLists[0].chainName).toBe('lumera');
  });
});
