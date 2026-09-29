import { describe, expect, it } from 'vitest';

import { crossSitePath } from './network-provider';

describe('crossSitePath', () => {
  it('keeps a section that exists on every network', () => {
    expect(crossSitePath('/staking')).toBe('/staking');
    expect(crossSitePath('/governance')).toBe('/governance');
    expect(crossSitePath('/wallet/')).toBe('/wallet');
  });

  it('drops a chain-specific detail page back to its section', () => {
    // Proposal 12 on mainnet is not proposal 12 on testnet.
    expect(crossSitePath('/governance/12')).toBe('/governance');
  });

  it('falls back to the dashboard for pages with no counterpart', () => {
    expect(crossSitePath('/')).toBe('/');
    expect(crossSitePath('/tx/ABCDEF')).toBe('/');
    expect(crossSitePath('/action_id/20000')).toBe('/');
    // The faucet only exists on testnet.
    expect(crossSitePath('/faucet')).toBe('/');
  });
});
