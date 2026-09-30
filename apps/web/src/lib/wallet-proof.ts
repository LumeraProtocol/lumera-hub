// src/lib/wallet-proof.ts
import {
  ExtendedSecp256k1Signature,
  Secp256k1,
  Secp256k1Signature,
  keccak256,
  ripemd160,
  sha256,
} from '@cosmjs/crypto';
import { fromBase64, fromBech32, fromHex, toBase64, toBech32, toHex, toUtf8 } from '@cosmjs/encoding';

/*
 * Proof that a reader holds the wallet they claim: they sign a short message
 * and the server checks the signature against the address.
 *
 *   - EVM wallets (MetaMask) sign with personal_sign (EIP-191).
 *   - Cosmos wallets (Keplr, Leap) sign with signArbitrary (ADR-36). The key may
 *     be a plain secp256k1 key (sha256 digest, address = ripemd160(sha256(pub)))
 *     or an Ethereum-style one (keccak256 digest, address = keccak256(pub)[12:]),
 *     so both are tried.
 *
 * The signed message itself is built and checked in @/utils/wallet-proof-message.
 */

export { freshProofMessage, proofMessage } from '@/utils/wallet-proof-message';

const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

/** An EIP-191 personal_sign signature by `address` over `message`. */
export function verifyEvmSignature(address: string, message: string, signatureHex: string): boolean {
  try {
    const sig = fromHex(signatureHex.replace(/^0x/, ''));
    if (sig.length !== 65) return false;
    const fixed = new Uint8Array(sig);
    if (fixed[64] >= 27) fixed[64] -= 27;
    const body = toUtf8(message);
    const digest = keccak256(concat(toUtf8(`\x19Ethereum Signed Message:\n${body.length}`), body));
    const pubkey = Secp256k1.recoverPubkey(ExtendedSecp256k1Signature.fromFixedLength(fixed), digest);
    const recovered = `0x${toHex(keccak256(pubkey.slice(1)).slice(-20))}`;
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

/** The ADR-36 sign doc a wallet signs for signArbitrary (keys already in canonical order). */
const adr36SignDoc = (signer: string, message: string) =>
  toUtf8(
    JSON.stringify({
      account_number: '0',
      chain_id: '',
      fee: { amount: [], gas: '0' },
      memo: '',
      msgs: [{ type: 'sign/MsgSignData', value: { data: toBase64(toUtf8(message)), signer } }],
      sequence: '0',
    }),
  );

/** An ADR-36 signArbitrary signature by bech32 `address` over `message`. */
export function verifyCosmosSignature(
  address: string,
  message: string,
  pubkeyBase64: string,
  signatureBase64: string,
): boolean {
  try {
    const { prefix } = fromBech32(address);
    const pubkey = fromBase64(pubkeyBase64);
    const signature = Secp256k1Signature.fromFixedLength(fromBase64(signatureBase64));
    const doc = adr36SignDoc(address, message);

    const cosmosAddress = toBech32(prefix, ripemd160(sha256(Secp256k1.compressPubkey(pubkey))));
    if (cosmosAddress === address && Secp256k1.verifySignature(signature, sha256(doc), pubkey)) return true;

    const ethAddress = toBech32(prefix, keccak256(Secp256k1.uncompressPubkey(pubkey).slice(1)).slice(-20));
    return ethAddress === address && Secp256k1.verifySignature(signature, keccak256(doc), pubkey);
  } catch {
    return false;
  }
}
