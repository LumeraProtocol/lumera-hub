import { describe, expect, it } from 'vitest';
import { Secp256k1, keccak256, ripemd160, sha256 } from '@cosmjs/crypto';
import { toBase64, toBech32, toHex, toUtf8 } from '@cosmjs/encoding';

import { freshProofMessage, proofMessage, verifyCosmosSignature, verifyEvmSignature } from './wallet-proof';

const PRIV = new Uint8Array(32).fill(7);
const OTHER = new Uint8Array(32).fill(9);

const evmAddress = (priv: Uint8Array) =>
  `0x${toHex(keccak256(Secp256k1.makeKeypair(priv).pubkey.slice(1)).slice(-20))}`;

const personalSign = (priv: Uint8Array, message: string) => {
  const body = toUtf8(message);
  const prefix = toUtf8(`\x19Ethereum Signed Message:\n${body.length}`);
  const joined = new Uint8Array(prefix.length + body.length);
  joined.set(prefix);
  joined.set(body, prefix.length);
  const sig = Secp256k1.createSignature(keccak256(joined), priv);
  return `0x${toHex(sig.toFixedLength().slice(0, 64))}${(sig.recovery + 27).toString(16)}`;
};

const adr36 = (priv: Uint8Array, signer: string, message: string, hash: (b: Uint8Array) => Uint8Array) => {
  const doc = toUtf8(
    JSON.stringify({
      account_number: '0',
      chain_id: '',
      fee: { amount: [], gas: '0' },
      memo: '',
      msgs: [{ type: 'sign/MsgSignData', value: { data: toBase64(toUtf8(message)), signer } }],
      sequence: '0',
    }),
  );
  const pair = Secp256k1.makeKeypair(priv);
  return {
    pubkey: toBase64(Secp256k1.compressPubkey(pair.pubkey)),
    signature: toBase64(Secp256k1.createSignature(hash(doc), priv).toFixedLength().slice(0, 64)),
  };
};

describe('verifyEvmSignature', () => {
  const address = evmAddress(PRIV);
  const message = proofMessage(address, '2026-09-30T12:00:00.000Z');

  it('accepts a personal_sign signature from the address', () => {
    expect(verifyEvmSignature(address, message, personalSign(PRIV, message))).toBe(true);
    expect(verifyEvmSignature(address.toUpperCase().replace('0X', '0x'), message, personalSign(PRIV, message))).toBe(true);
  });

  it('rejects another key, another message, or garbage', () => {
    expect(verifyEvmSignature(address, message, personalSign(OTHER, message))).toBe(false);
    expect(verifyEvmSignature(address, `${message}!`, personalSign(PRIV, message))).toBe(false);
    expect(verifyEvmSignature(address, message, '0x1234')).toBe(false);
  });
});

describe('verifyCosmosSignature', () => {
  const pub = Secp256k1.compressPubkey(Secp256k1.makeKeypair(PRIV).pubkey);
  const cosmos = toBech32('lumera', ripemd160(sha256(pub)));
  const eth = toBech32('lumera', keccak256(Secp256k1.uncompressPubkey(pub).slice(1)).slice(-20));

  it('accepts ADR-36 from a secp256k1 key', () => {
    const message = proofMessage(cosmos, '2026-09-30T12:00:00.000Z');
    const { pubkey, signature } = adr36(PRIV, cosmos, message, sha256);
    expect(verifyCosmosSignature(cosmos, message, pubkey, signature)).toBe(true);
  });

  it('accepts ADR-36 from an Ethereum-style key', () => {
    const message = proofMessage(eth, '2026-09-30T12:00:00.000Z');
    const { pubkey, signature } = adr36(PRIV, eth, message, keccak256);
    expect(verifyCosmosSignature(eth, message, pubkey, signature)).toBe(true);
  });

  it('rejects a key that does not own the address', () => {
    const message = proofMessage(cosmos, '2026-09-30T12:00:00.000Z');
    const { pubkey, signature } = adr36(OTHER, cosmos, message, sha256);
    expect(verifyCosmosSignature(cosmos, message, pubkey, signature)).toBe(false);
  });
});

describe('freshProofMessage', () => {
  const now = Date.parse('2026-09-30T12:05:00Z');

  it('accepts a recent message for this address only', () => {
    expect(freshProofMessage(proofMessage('0xabc', '2026-09-30T12:00:00.000Z'), '0xabc', now)).toBe(true);
    expect(freshProofMessage(proofMessage('0xabc', '2026-09-30T12:00:00.000Z'), '0xdef', now)).toBe(false);
  });

  it('rejects a stale or malformed message', () => {
    expect(freshProofMessage(proofMessage('0xabc', '2026-09-30T11:00:00.000Z'), '0xabc', now)).toBe(false);
    expect(freshProofMessage('Link wallet 0xabc', '0xabc', now)).toBe(false);
  });
});
