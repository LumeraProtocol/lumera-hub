import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contants/network', () => ({
  // A configured base carries a trailing slash; the chain id must still land
  // between it and the route, with exactly one separator.
  PORTAL_URL: 'https://portal.testnet.lumera.io/',
  CHAIN_ID: 'lumera-testnet-2',
}));

const { explorerAccountUrl, explorerBlockUrl, explorerTxUrl, explorerValidatorUrl } = await import(
  './explorer'
);

const HASH = 'E08758EDE24ADC87BA0EFBACF2AC4256A7B518CC08A6831D6D8A6D014B007235';

describe('explorer links', () => {
  it('namespaces a transaction under its chain', () => {
    expect(explorerTxUrl(HASH)).toBe(
      `https://portal.testnet.lumera.io/lumera-testnet-2/tx/${HASH}`,
    );
  });

  it('namespaces validators, accounts and blocks the same way', () => {
    expect(explorerValidatorUrl('lumeravaloper1abc')).toBe(
      'https://portal.testnet.lumera.io/lumera-testnet-2/validator/lumeravaloper1abc',
    );
    expect(explorerAccountUrl('lumera1abc')).toBe(
      'https://portal.testnet.lumera.io/lumera-testnet-2/account/lumera1abc',
    );
    expect(explorerBlockUrl(6564081)).toBe(
      'https://portal.testnet.lumera.io/lumera-testnet-2/block/6564081',
    );
  });

  it('never doubles the separator', () => {
    expect(explorerTxUrl(HASH)).not.toContain('//lumera-testnet-2');
  });
});
