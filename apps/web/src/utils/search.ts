import { fromBech32 } from '@cosmjs/encoding';
import { evmAddressToCosmosAddress, isEvmAddress } from './evm';

const BECH32_PREFIX = 'lumera';
const VALOPER_PREFIX = 'lumeravaloper';

export const parseSearchQuery = (input: string): string | null => {
  const query = input.trim();
  if (!query) return null;

  if (/^\d+$/.test(query)) {
    // Block heights are canonical positive integers, so drop leading zeros and
    // reject an all-zero height rather than routing to /block/0 or /block/007.
    const height = query.replace(/^0+/, '');
    return height ? `/block/${height}` : null;
  }

  const hash = query.startsWith('0x') || query.startsWith('0X')
    ? query.slice(2)
    : query;
  if (/^[0-9a-fA-F]{64}$/.test(hash)) {
    return `/tx/${hash.toUpperCase()}`;
  }

  const lowered = query.toLowerCase();
  if (isEvmAddress(lowered)) {
    return `/account/${evmAddressToCosmosAddress(lowered, BECH32_PREFIX)}`;
  }

  try {
    const { prefix, data } = fromBech32(lowered);
    if (data.length !== 20) return null;
    if (prefix === VALOPER_PREFIX) return `/staking/${lowered}`;
    if (prefix === BECH32_PREFIX) return `/account/${lowered}`;
  } catch {
    return null;
  }

  return null;
};
