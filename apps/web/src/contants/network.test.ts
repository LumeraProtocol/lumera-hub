import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENVIRONMENT_KEYS = [
  'NEXT_PUBLIC_NETWORK_PROFILE',
  'NEXT_PUBLIC_NODE_ENV',
  'NEXT_PUBLIC_CHAIN_NAME',
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_DENOM',
  'NEXT_PUBLIC_RPC_ENDPOINT',
  'NEXT_PUBLIC_REST_AI_URL',
  'NEXT_PUBLIC_EVM_RPC_ENDPOINT',
  'NEXT_PUBLIC_EVM_WS_ENDPOINT',
  'NEXT_PUBLIC_EVM_PROFILE_NAME',
  'NEXT_PUBLIC_EVM_CHAIN_ID',
  'NEXT_PUBLIC_COSMOS_EIP712_ENABLED',
  'NEXT_PUBLIC_SDK_PRESET',
  'NEXT_PUBLIC_SNSCOPE_URL',
] as const;

const originalEnvironment = Object.fromEntries(
  ENVIRONMENT_KEYS.map((key) => [key, process.env[key]])
);

beforeEach(() => {
  for (const key of ENVIRONMENT_KEYS) delete process.env[key];
  vi.resetModules();
});

afterEach(() => {
  for (const key of ENVIRONMENT_KEYS) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

describe('network profiles', () => {
  it('defaults to the non-EVM mainnet profile', async () => {
    const network = await import('./network');
    expect(network.NETWORK_PROFILE).toBe('mainnet');
    expect(network.IS_EVM_NETWORK).toBe(false);
    expect(network.SDK_PRESET).toBe('mainnet');
    expect(network.SNSCOPE_URL).toBe('https://snscope.lumera.io');
    expect(network.PORTAL_URL).toBe('https://portal.lumera.io/');
  });

  it('selects the complete testnet EVM profile', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'testnet';
    const network = await import('./network');
    expect(network.CHAIN_ID).toBe('lumera-testnet-2');
    expect(network.EVM_CHAIN_ID).toBe(76857769);
    expect(network.EVM_PROFILE_NAME).toBe('lumera-testnet-evm');
    expect(network.EVM_RPC_ENDPOINT).toBe('https://evm-testnet.lumeraprotocol.com');
    expect(network.IS_EVM_NETWORK).toBe(true);
    expect(network.SDK_PRESET).toBe('testnet');
    expect(network.SNSCOPE_URL).toBe('https://snscope.testnet.lumera.io');
    expect(network.PORTAL_URL).toBe('https://portal.testnet.lumera.io/');
  });

  it('keeps the devnet SDK and SNScope endpoints on the dev/test network', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'devnet';
    const network = await import('./network');

    expect(network.SDK_PRESET).toBe('testnet');
    expect(network.SNSCOPE_URL).toBe('https://p1p2p3p4.pastel.network/snscope');
    expect(network.PORTAL_URL).toBe('https://portal.testnet.lumera.io/');
  });

  it('allows explicit SDK and SNScope overrides for private deployments', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'testnet';
    process.env.NEXT_PUBLIC_SDK_PRESET = 'mainnet';
    process.env.NEXT_PUBLIC_SNSCOPE_URL = 'https://snscope.example/';
    const network = await import('./network');

    expect(network.SDK_PRESET).toBe('mainnet');
    // Trailing slashes are stripped so call sites can join `${SNSCOPE_URL}/v1/...`.
    expect(network.SNSCOPE_URL).toBe('https://snscope.example');
    expect(network.PORTAL_URL).toBe('https://portal.lumera.io/');
  });

  it('keeps Cosmos EIP-712 disabled unless explicitly enabled', async () => {
    let network = await import('./network');
    expect(network.COSMOS_EIP712_ENABLED).toBe(false);

    vi.resetModules();
    process.env.NEXT_PUBLIC_COSMOS_EIP712_ENABLED = 'true';
    network = await import('./network');
    expect(network.COSMOS_EIP712_ENABLED).toBe(true);
  });

  it('rejects unknown profiles and malformed chain IDs', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'staging';
    await expect(import('./network')).rejects.toThrow('Unknown network profile');

    vi.resetModules();
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'testnet';
    process.env.NEXT_PUBLIC_EVM_CHAIN_ID = '1.5';
    await expect(import('./network')).rejects.toThrow('positive integer');
  });

  it('does not advertise EVM support for an incomplete private profile', async () => {
    process.env.NEXT_PUBLIC_EVM_RPC_ENDPOINT = 'https://evm.private.example';
    process.env.NEXT_PUBLIC_EVM_CHAIN_ID = '76857769';

    const network = await import('./network');

    expect(network.EVM_RPC_ENDPOINT).toBe('https://evm.private.example');
    expect(network.EVM_CHAIN_ID).toBe(76857769);
    expect(network.EVM_PROFILE_NAME).toBeNull();
    expect(network.IS_EVM_NETWORK).toBe(false);
  });
});
