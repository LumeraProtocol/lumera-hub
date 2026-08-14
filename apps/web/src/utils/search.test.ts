import { describe, expect, it } from 'vitest';
import { toBech32, fromHex } from '@cosmjs/encoding';
import { parseSearchQuery } from './search';

const HEX_20_BYTES = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const ACCOUNT_ADDRESS = toBech32('lumera', fromHex(HEX_20_BYTES));
const VALOPER_ADDRESS = toBech32('lumeravaloper', fromHex(HEX_20_BYTES));
const TX_HASH = 'ab'.repeat(32);

describe('parseSearchQuery', () => {
  it('routes a block height to the block inspector', () => {
    expect(parseSearchQuery('123456')).toBe('/block/123456');
  });

  it('routes a transaction hash to the transaction inspector uppercased', () => {
    expect(parseSearchQuery(TX_HASH)).toBe(`/tx/${TX_HASH.toUpperCase()}`);
  });

  it('accepts a transaction hash with a 0x prefix', () => {
    expect(parseSearchQuery(`0x${TX_HASH}`)).toBe(`/tx/${TX_HASH.toUpperCase()}`);
  });

  it('accepts a mixed-case transaction hash', () => {
    expect(parseSearchQuery('aB'.repeat(32))).toBe(`/tx/${TX_HASH.toUpperCase()}`);
  });

  it('converts an EVM hex address to a bech32 account route', () => {
    expect(parseSearchQuery(`0x${HEX_20_BYTES}`)).toBe(`/account/${ACCOUNT_ADDRESS}`);
  });

  it('accepts an EVM hex address in any case', () => {
    expect(parseSearchQuery(`0x${HEX_20_BYTES.toUpperCase()}`)).toBe(
      `/account/${ACCOUNT_ADDRESS}`,
    );
  });

  it('routes a bech32 account address to the account inspector', () => {
    expect(parseSearchQuery(ACCOUNT_ADDRESS)).toBe(`/account/${ACCOUNT_ADDRESS}`);
  });

  it('accepts an uppercase bech32 account address', () => {
    expect(parseSearchQuery(ACCOUNT_ADDRESS.toUpperCase())).toBe(
      `/account/${ACCOUNT_ADDRESS}`,
    );
  });

  it('routes a validator operator address to the staking inspector', () => {
    expect(parseSearchQuery(VALOPER_ADDRESS)).toBe(`/staking/${VALOPER_ADDRESS}`);
  });

  it('trims surrounding whitespace before classifying', () => {
    expect(parseSearchQuery('  123456  ')).toBe('/block/123456');
  });

  it('returns null for an empty query', () => {
    expect(parseSearchQuery('   ')).toBeNull();
  });

  it('returns null for a bech32 address with a foreign prefix', () => {
    const foreign = toBech32('cosmos', fromHex(HEX_20_BYTES));
    expect(parseSearchQuery(foreign)).toBeNull();
  });

  it('returns null for a malformed bech32 address', () => {
    expect(parseSearchQuery('lumera1notarealaddress')).toBeNull();
  });

  it('returns null for hex of the wrong length', () => {
    expect(parseSearchQuery('0xabc123')).toBeNull();
  });

  it('returns null for arbitrary text', () => {
    expect(parseSearchQuery('hello world')).toBeNull();
  });
});
