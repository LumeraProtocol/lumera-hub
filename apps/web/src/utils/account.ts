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
