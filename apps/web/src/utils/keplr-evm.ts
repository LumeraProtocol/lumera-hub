/*
 * Setting Keplr up for Lumera's EVM accounts.
 *
 * Accounts migrated to EVM keys (lumera/evmigration) live at the address of an
 * Ethereum-path key: coin type 60, address = keccak of the key. Keplr's stock
 * entry for the testnet uses the Cosmos path (coin type 118), so it shows the
 * reader's old, pre-migration address and never the migrated one. Suggesting
 * the chain with coin type 60 and Keplr's Ethereum-key features makes Keplr
 * derive and sign with the migrated key.
 *
 * Keplr ignores a suggestion for a chain it already has, so whether it took is
 * read back from the key Keplr then reports, not assumed.
 */

import {
  CHAIN_ID,
  DENOM,
  EVM_CHAIN_ID,
  NETWORK_LABEL,
  REST_AI_URL,
  RPC_ENDPOINT,
} from '@/contants/network'

type KeplrKey = { algo?: string; bech32Address?: string; isNanoLedger?: boolean }

type KeplrLike = {
  experimentalSuggestChain?: (chainInfo: object) => Promise<void>
  enable?: (chainId: string) => Promise<void>
  getKey?: (chainId: string) => Promise<KeplrKey>
}

const PREFIX = 'lumera'

/** Keplr's chain info for the active network, set up for EVM (coin type 60) keys. */
export const lumeraEvmChainInfo = () => {
  const coin = {
    coinDenom: DENOM.replace(/^u/, '').toUpperCase(),
    coinMinimalDenom: DENOM,
    coinDecimals: 6,
  }
  return {
    chainId: CHAIN_ID,
    chainName: `Lumera ${NETWORK_LABEL}`,
    rpc: RPC_ENDPOINT,
    rest: REST_AI_URL,
    bip44: { coinType: 60 },
    bech32Config: {
      bech32PrefixAccAddr: PREFIX,
      bech32PrefixAccPub: `${PREFIX}pub`,
      bech32PrefixValAddr: `${PREFIX}valoper`,
      bech32PrefixValPub: `${PREFIX}valoperpub`,
      bech32PrefixConsAddr: `${PREFIX}valcons`,
      bech32PrefixConsPub: `${PREFIX}valconspub`,
    },
    currencies: [coin],
    feeCurrencies: [{ ...coin, gasPriceStep: { low: 0.025, average: 0.03, high: 0.04 } }],
    stakeCurrency: coin,
    // eth-address-gen: keccak addresses; eth-key-sign: sign with the EVM key;
    // eth-secp256k1-cosmos: label the key /cosmos.evm.crypto.v1.ethsecp256k1.PubKey
    // (cosmos/evm) rather than Ethermint's type, in Keplr's own transactions.
    features: ['eth-address-gen', 'eth-key-sign', 'eth-secp256k1-cosmos'],
  }
}

/** Keplr is deriving and signing with the EVM key for this chain. */
export const keplrUsesEvmKey = (key: KeplrKey | undefined): boolean =>
  key?.algo === 'ethsecp256k1' || key?.algo === 'eth_secp256k1'

export type KeplrEvmResult =
  /** Keplr now uses the EVM key; `address` is the migrated address it shows. */
  | { status: 'applied'; address: string }
  /** Keplr kept the chain's existing (Cosmos-key) settings; it must be removed there first. */
  | { status: 'kept-existing'; address: string }

/** Only where the network has an EVM chain — mainnet has not migrated. */
export const canAddLumeraEvmToKeplr = (win: { keplr?: unknown } | undefined) =>
  Boolean(EVM_CHAIN_ID) && Boolean((win?.keplr as KeplrLike | undefined)?.experimentalSuggestChain)

export async function addLumeraEvmToKeplr(keplr: KeplrLike | undefined): Promise<KeplrEvmResult> {
  if (!keplr?.experimentalSuggestChain) throw new Error('Keplr was not detected. Install or unlock the Keplr extension.')
  if (!EVM_CHAIN_ID) throw new Error(`Lumera ${NETWORK_LABEL} has no EVM accounts to set up.`)

  await keplr.experimentalSuggestChain(lumeraEvmChainInfo())
  await keplr.enable?.(CHAIN_ID)
  const key = await keplr.getKey?.(CHAIN_ID)
  const address = key?.bech32Address ?? ''
  return keplrUsesEvmKey(key) ? { status: 'applied', address } : { status: 'kept-existing', address }
}
