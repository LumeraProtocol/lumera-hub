import { describe, expect, it } from 'vitest';
import { toBech32, fromHex } from '@cosmjs/encoding';

import {
  getConnectedAccountQueryAddress,
  parseAccountAddress,
  resolveAccountRouteAddress,
} from './account';

const HEX_20_BYTES = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const ACCOUNT_ADDRESS = toBech32('lumera', fromHex(HEX_20_BYTES));

describe('parseAccountAddress', () => {
  it('returns both formats for a bech32 account address', () => {
    expect(parseAccountAddress(ACCOUNT_ADDRESS)).toEqual({
      bech32Address: ACCOUNT_ADDRESS,
      ethAddress: `0x${HEX_20_BYTES}`,
    });
  });

  it('accepts an uppercase bech32 address', () => {
    expect(parseAccountAddress(ACCOUNT_ADDRESS.toUpperCase())).toEqual({
      bech32Address: ACCOUNT_ADDRESS,
      ethAddress: `0x${HEX_20_BYTES}`,
    });
  });

  it('accepts an EVM hex address in any case', () => {
    expect(parseAccountAddress(`0x${HEX_20_BYTES.toUpperCase()}`)).toEqual({
      bech32Address: ACCOUNT_ADDRESS,
      ethAddress: `0x${HEX_20_BYTES}`,
    });
  });

  it('rejects a bech32 address with a foreign prefix', () => {
    expect(parseAccountAddress(toBech32('cosmos', fromHex(HEX_20_BYTES)))).toBeNull();
  });

  it('rejects a validator operator address', () => {
    expect(parseAccountAddress(toBech32('lumeravaloper', fromHex(HEX_20_BYTES)))).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseAccountAddress('lumera1notarealaddress')).toBeNull();
    expect(parseAccountAddress('')).toBeNull();
    expect(parseAccountAddress('0xabc')).toBeNull();
  });
});

describe('resolveAccountRouteAddress', () => {
  it('resolves a hex route param to the same account as its bech32 form', () => {
    expect(resolveAccountRouteAddress(`0x${HEX_20_BYTES}`)).toBe(ACCOUNT_ADDRESS);
    expect(resolveAccountRouteAddress(`0x${HEX_20_BYTES.toUpperCase()}`)).toBe(ACCOUNT_ADDRESS);
  });

  it('keeps a bech32 route param queryable', () => {
    expect(resolveAccountRouteAddress(ACCOUNT_ADDRESS)).toBe(ACCOUNT_ADDRESS);
    expect(resolveAccountRouteAddress(ACCOUNT_ADDRESS.toUpperCase())).toBe(ACCOUNT_ADDRESS);
  });

  it('passes unresolvable input through so the page still renders empty', () => {
    expect(resolveAccountRouteAddress('lumera1notarealaddress')).toBe('lumera1notarealaddress');
  });

  it('reads the first segment of a missing or repeated route param', () => {
    expect(resolveAccountRouteAddress(undefined)).toBe('');
    expect(resolveAccountRouteAddress([])).toBe('');
    expect(resolveAccountRouteAddress([`0x${HEX_20_BYTES}`, 'ignored'])).toBe(ACCOUNT_ADDRESS);
  });
});

describe('getConnectedAccountQueryAddress', () => {
  it('uses the derived Bech32 address for a MetaMask account', () => {
    expect(getConnectedAccountQueryAddress({
      address: `0x${HEX_20_BYTES}`,
      bech32Address: ACCOUNT_ADDRESS,
      isEvm: true,
    })).toBe(ACCOUNT_ADDRESS);
  });

  it('keeps the native address for a Cosmos wallet', () => {
    expect(getConnectedAccountQueryAddress({
      address: ACCOUNT_ADDRESS,
      bech32Address: ACCOUNT_ADDRESS,
      isEvm: false,
    })).toBe(ACCOUNT_ADDRESS);
  });
});
