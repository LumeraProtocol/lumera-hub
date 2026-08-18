import { fromBech32 } from '@cosmjs/encoding';

import { cosmosAddressToEvmAddress, evmAddressToCosmosAddress, isEvmAddress } from './evm';

const BECH32_PREFIX = 'lumera';

export interface AccountAddressFormats {
  bech32Address: string;
  ethAddress: string;
}

export const parseAccountAddress = (input: string): AccountAddressFormats | null => {
  const lowered = input.trim().toLowerCase();
  if (!lowered) return null;

  if (isEvmAddress(lowered)) {
    return {
      bech32Address: evmAddressToCosmosAddress(lowered, BECH32_PREFIX),
      ethAddress: lowered,
    };
  }

  try {
    const { prefix, data } = fromBech32(lowered);
    if (prefix !== BECH32_PREFIX || data.length !== 20) return null;
    return {
      bech32Address: lowered,
      ethAddress: cosmosAddressToEvmAddress(lowered),
    };
  } catch {
    return null;
  }
};

/**
 * Resolves the `[address]` route segment of `/account/…` to the Bech32 address
 * the chain APIs are keyed by, so a `0x…` address typed straight into the
 * address bar resolves the same account as its `lumera1…` form. Input that is
 * neither format is passed through unchanged, so the page keeps rendering its
 * usual empty-account state instead of silently querying something else.
 */
export const resolveAccountRouteAddress = (param?: string | string[]): string => {
  const raw = (Array.isArray(param) ? param[0] : param) ?? '';
  if (!raw) return '';
  return parseAccountAddress(raw)?.bech32Address ?? raw;
};
