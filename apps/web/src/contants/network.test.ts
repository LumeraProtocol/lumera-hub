import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapiReachableFrom } from './network';

describe('snapiReachableFrom', () => {
  it('trusts a real host from anywhere', () => {
    expect(snapiReachableFrom('https://snapi.lumera.io', 'hub.lumera.io')).toBe(true);
    expect(snapiReachableFrom('https://snapi.lumera.io', 'localhost')).toBe(true);
  });

  it('allows a loopback SNAPI only from a page on the same machine', () => {
    expect(snapiReachableFrom('http://localhost:3100', 'localhost')).toBe(true);
    expect(snapiReachableFrom('http://127.0.0.1:3100', '127.0.0.1')).toBe(true);
  });

  it('refuses a loopback SNAPI from a deployed page', () => {
    // The bug this exists to prevent: every profile defaults SNAPI to
    // localhost, so a deployment asked the visitor's own machine for it.
    expect(snapiReachableFrom('http://localhost:3100', 'lumera-hub-mainnet.vercel.app')).toBe(false);
    expect(snapiReachableFrom('http://localhost:3100', 'hub.lumera.io')).toBe(false);
  });

  it('refuses a loopback SNAPI with no page at all, as on the server', () => {
    expect(snapiReachableFrom('http://localhost:3100', null)).toBe(false);
  });

  it('refuses an unset or unparseable url', () => {
    expect(snapiReachableFrom('', 'localhost')).toBe(false);
    expect(snapiReachableFrom('not a url', 'localhost')).toBe(false);
  });
});

// The runtime still depends on profile selection and endpoint ordering, so keep
// that behaviour covered alongside the SNAPI cases. These assert only the
// env-derived and pure exports, not the live bindings applyProfile mutates from
// stored state, so they stay deterministic.
describe('network profile selection', () => {
  const original = process.env.NEXT_PUBLIC_NETWORK_PROFILE;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_NETWORK_PROFILE;
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_NETWORK_PROFILE;
    else process.env.NEXT_PUBLIC_NETWORK_PROFILE = original;
    vi.resetModules();
  });

  it('defaults to mainnet when no profile is set', async () => {
    const net = await import('./network');
    expect(net.DEFAULT_NETWORK_PROFILE).toBe('mainnet');
  });

  it('selects the testnet profile when asked', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'testnet';
    const net = await import('./network');
    expect(net.DEFAULT_NETWORK_PROFILE).toBe('testnet');
  });

  it('throws on an unknown profile rather than guessing one', async () => {
    process.env.NEXT_PUBLIC_NETWORK_PROFILE = 'nope';
    await expect(import('./network')).rejects.toThrow(/Unknown network profile/);
  });

  it('leads each profile endpoint list with its configured primary, fallbacks after', async () => {
    const net = await import('./network');
    const testnetRpc = net.rpcEndpointsFor('testnet');
    expect(testnetRpc[0]).toBe('https://rpc-testnet.lumeraprotocol.com');
    expect(testnetRpc.length).toBeGreaterThan(1);

    const mainnetRpc = net.rpcEndpointsFor('mainnet');
    expect(mainnetRpc[0]).toBe('https://lumera-rpc.polkachu.com');
    expect(mainnetRpc.length).toBeGreaterThan(1);
  });
});
