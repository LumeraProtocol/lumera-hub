import { describe, expect, it } from 'vitest';
import { toBech32, fromHex } from '@cosmjs/encoding';

import { parseAccountAddress } from './account';

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
