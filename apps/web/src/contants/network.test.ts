import { describe, expect, it } from 'vitest';
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
