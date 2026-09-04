import { sha256 } from '@cosmjs/crypto';
import { fromBase64, fromBech32, toBech32 } from '@cosmjs/encoding';

/**
 * Derives a validator's consensus address from its consensus public key.
 *
 * The slashing module reports missed blocks keyed by consensus address
 * (`lumeravalcons1…`), while the staking module returns validators keyed by
 * operator address and carrying only the raw consensus pubkey. Without this
 * bridge the two responses cannot be joined, which is why uptime rendered as
 * an em dash for every validator.
 *
 * The derivation is the Tendermint one: SHA-256 of the raw key, truncated to
 * the first 20 bytes, bech32-encoded with the chain's valcons prefix.
 */
export const consensusAddressFromPubkey = (
  pubkeyBase64: string,
  prefix = 'lumeravalcons',
): string | null => {
  if (!pubkeyBase64) return null;
  try {
    const raw = fromBase64(pubkeyBase64);
    return toBech32(prefix, sha256(raw).slice(0, 20));
  } catch {
    // A key in an unexpected format is not worth failing the page over; the
    // caller renders "—" for uptime instead.
    return null;
  }
};

/**
 * The account address behind a validator's operator address.
 *
 * `lumeravaloper1…` and `lumera1…` wrap the same 20-byte payload under
 * different prefixes, so a validator's self-delegation can be looked up
 * without asking the chain for a second record.
 */
export const accountAddressFromOperator = (
  operatorAddress: string,
  prefix = 'lumera',
): string | null => {
  if (!operatorAddress) return null;
  try {
    const { data } = fromBech32(operatorAddress);
    return toBech32(prefix, data);
  } catch {
    return null;
  }
};
