/*
 * Setting Keplr up for Lumera's EVM accounts.
 *
 * Accounts migrated to EVM keys (lumera/evmigration) live at the address of an
 * Ethereum-path key: coin type 60, address = keccak of the key. Keplr's stock
 * entry for the testnet uses the Cosmos path (coin type 118), so it shows the
 * reader's old, pre-migration address and never the migrated one.
 *
 * Suggesting the chain with coin type 60 and Keplr's Ethereum-key features is
 * only half of it. A Keplr profile that already used the chain keeps its old
 * (coin type 118) key and merely shows that key's EVM-style address — one
 * nobody migrated to, so it is empty. Only a profile imported afresh from the
 * recovery phrase derives the new key. So the hub reads the migration recorded
 * on chain and compares: the old key's Cosmos-style address is the legacy
 * address, its record names the new one, and Keplr either shows that or the
 * reader is told to re-import (or use the EVM wallet they migrated with).
 *
 * Keplr ignores a suggestion for a chain it already has, and gives sites no way
 * to remove or change one (or any site could re-point a wallet's addresses), so
 * when the old settings stay the reader removes the chain in Keplr and the hub
 * notices it is gone (keplrChainState) and adds it back.
 */

import { ripemd160, sha256 } from '@cosmjs/crypto'
import { fromBech32, toBech32, toHex } from '@cosmjs/encoding'

import {
  CHAIN_ID,
  DENOM,
  EVM_CHAIN_ID,
  NETWORK_LABEL,
  REST_AI_URL,
  RPC_ENDPOINT,
} from '@/contants/network'

type KeplrKey = { algo?: string; bech32Address?: string; pubKey?: Uint8Array; isNanoLedger?: boolean }

type KeplrLike = {
  experimentalSuggestChain?: (chainInfo: object) => Promise<void>
  enable?: (chainId: string) => Promise<void>
  getKey?: (chainId: string) => Promise<KeplrKey>
}

const PREFIX = 'lumera'

/** Where Keplr removes a chain a site added — "Add/Remove Chains" only hides it. */
export const KEPLR_REMOVE_CHAIN_PATH = 'Settings → Chains & Assets → Remove Custom Chains'

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

/** Only where the network has an EVM chain — mainnet has not migrated. */
export const canAddLumeraEvmToKeplr = (win: { keplr?: unknown } | undefined) =>
  Boolean(EVM_CHAIN_ID) && Boolean((win?.keplr as KeplrLike | undefined)?.experimentalSuggestChain)

/* ------------------------------------------------------------- migrations */

export type Migration = { legacyAddress: string; newAddress: string; height?: string }

/** Reads a chain REST path and returns its JSON body. */
export type FetchJson = (path: string) => Promise<unknown>

/** The legacy (coin type 118, Cosmos-style) address of a key. */
export const legacyAddressOf = (pubkey: Uint8Array): string => toBech32(PREFIX, ripemd160(sha256(pubkey)))

/** The 0x form of a Lumera address, as an EVM wallet shows it. */
export const evmAddressOf = (address: string): string => `0x${toHex(fromBech32(address).data)}`

/**
 * The migration recorded on chain for a legacy address: null when it was not
 * migrated. Throws when the record cannot be read, so "not migrated" is never
 * guessed from a failed request.
 */
export async function migrationFor(legacyAddress: string, fetchJson: FetchJson): Promise<Migration | null> {
  const body = (await fetchJson(`/lumera/evmigration/migration_record/${legacyAddress}`)) as {
    record?: { legacy_address?: string; new_address?: string; migration_height?: string } | null
  }
  if (!body || !('record' in body)) throw new Error('Unexpected answer from the migration records')
  const record = body.record
  if (!record?.new_address) return null
  return {
    legacyAddress: record.legacy_address || legacyAddress,
    newAddress: record.new_address,
    height: record.migration_height,
  }
}

/**
 * How the Keplr profile stands against its migration:
 *
 * - `ready`: nothing hidden — Keplr shows the migrated address, or a fresh
 *   EVM-key profile whose key never held a legacy account;
 * - `needs-evm-settings`: migrated, and Keplr still has the old chain settings;
 * - `reimport`: Keplr has the EVM settings but this profile holds the old key,
 *   so it shows an empty address; the migrated one needs the recovery phrase
 *   re-imported (or the EVM wallet the migration was signed with);
 * - `not-migrated`: this key's legacy account was never migrated, so switching
 *   Keplr would only hide its funds behind an empty address.
 */
export type KeplrMigrationStatus =
  | { kind: 'ready'; keplrAddress: string; migration?: Migration }
  | { kind: 'needs-evm-settings'; keplrAddress: string; migration: Migration }
  | { kind: 'reimport'; keplrAddress: string; migration: Migration }
  | { kind: 'not-migrated'; keplrAddress: string; legacyAddress: string }

/**
 * @param legacyInUse whether the key's legacy (Cosmos-style) address has ever
 *   been used on chain — only consulted when there is no migration record.
 */
export function judgeKeplrMigration(
  key: KeplrKey,
  migration: Migration | null,
  legacyAddress: string,
  legacyInUse: boolean,
): KeplrMigrationStatus {
  const keplrAddress = key.bech32Address ?? ''
  if (migration) {
    if (keplrAddress === migration.newAddress) return { kind: 'ready', keplrAddress, migration }
    return keplrUsesEvmKey(key)
      ? { kind: 'reimport', keplrAddress, migration }
      : { kind: 'needs-evm-settings', keplrAddress, migration }
  }
  // No record. On the old settings Keplr shows the legacy account itself; on the
  // EVM settings it is either a fresh EVM key (its Cosmos-style address unused)
  // or an unmigrated legacy key whose funds the EVM address now hides.
  if (keplrUsesEvmKey(key) && !legacyInUse) return { kind: 'ready', keplrAddress }
  return { kind: 'not-migrated', keplrAddress, legacyAddress }
}

/** The address has an account on chain (it has received funds or signed). */
export async function accountExists(address: string, fetchJson: FetchJson): Promise<boolean> {
  try {
    const body = (await fetchJson(`/cosmos/auth/v1beta1/accounts/${address}`)) as { account?: unknown }
    return Boolean(body?.account)
  } catch (error) {
    const e = error as { statusCode?: number; message?: string } | null
    if (e?.statusCode === 404 || /not found/i.test(String(e?.message ?? ''))) return false
    throw error
  }
}

/** Reads Keplr's key for the chain and the migration recorded for it. */
export async function keplrMigrationStatus(
  keplr: KeplrLike | undefined,
  fetchJson: FetchJson,
): Promise<KeplrMigrationStatus> {
  if (!keplr?.getKey) throw new Error('Keplr was not detected. Install or unlock the Keplr extension.')
  await keplr.enable?.(CHAIN_ID)
  const key = await keplr.getKey(CHAIN_ID)
  if (!(key.pubKey instanceof Uint8Array)) throw new Error('Keplr did not share this account’s key.')
  const legacyAddress = legacyAddressOf(key.pubKey)
  const migration = await migrationFor(legacyAddress, fetchJson)
  const legacyInUse = migration || !keplrUsesEvmKey(key) ? true : await accountExists(legacyAddress, fetchJson)
  return judgeKeplrMigration(key, migration, legacyAddress, legacyInUse)
}

/* ------------------------------------------------------------------ setup */

export type KeplrEvmResult =
  | KeplrMigrationStatus
  /** Keplr kept the chain's existing (Cosmos-key) settings; it must be removed there first. */
  | { kind: 'kept-existing'; keplrAddress: string; migration: Migration }

/**
 * Checks the migration first and only then changes Keplr: an account that was
 * never migrated is left alone, and one Keplr already shows correctly is not
 * touched. Otherwise suggests the EVM settings and judges the result again.
 */
export async function addLumeraEvmToKeplr(keplr: KeplrLike | undefined, fetchJson: FetchJson): Promise<KeplrEvmResult> {
  if (!keplr?.experimentalSuggestChain) throw new Error('Keplr was not detected. Install or unlock the Keplr extension.')
  if (!EVM_CHAIN_ID) throw new Error(`Lumera ${NETWORK_LABEL} has no EVM accounts to set up.`)

  const before = await keplrMigrationStatus(keplr, fetchJson).catch((error) => {
    // The chain is missing from Keplr (removed while waiting): nothing to check
    // against yet, so add it and judge afterwards.
    if (isMissingChainError(error)) return null
    throw error
  })
  if (before && before.kind !== 'needs-evm-settings') return before

  await keplr.experimentalSuggestChain(lumeraEvmChainInfo())
  const after = await keplrMigrationStatus(keplr, fetchJson)
  if (before && after.kind === 'needs-evm-settings') return { ...after, kind: 'kept-existing' }
  return after
}

/** Keplr's error for a chain it does not have, e.g. "There is no modular chain info for …". */
export const isMissingChainError = (error: unknown): boolean =>
  /no (modular )?chain info|chain info .*not found|unknown chain/i.test(
    String((error as { message?: unknown } | null)?.message ?? error),
  )

/** What Keplr has for the chain now: EVM settings, Cosmos settings, nothing, or unknown (locked, refused). */
export async function keplrChainState(
  keplr: KeplrLike | undefined,
): Promise<'evm' | 'cosmos' | 'removed' | 'unknown'> {
  if (!keplr?.getKey) return 'unknown'
  try {
    return keplrUsesEvmKey(await keplr.getKey(CHAIN_ID)) ? 'evm' : 'cosmos'
  } catch (error) {
    return isMissingChainError(error) ? 'removed' : 'unknown'
  }
}

/* --------------------------------------------------------- profile switch */

/** Keplr's window event for a profile (or account) switch. */
export const KEPLR_KEYSTORE_CHANGE = 'keplr_keystorechange'

/**
 * After the reader re-imports their recovery phrase, which profile Keplr is on:
 * - `done`: it shows the migrated address;
 * - `old-profile`: still the pre-migration profile (nothing switched yet);
 * - `other-profile`: some other profile — not the one that holds the migration.
 */
export function judgeProfileSwitch(
  target: Migration,
  status: KeplrMigrationStatus | null,
): 'done' | 'old-profile' | 'other-profile' {
  if (!status) return 'old-profile'
  if (status.keplrAddress === target.newAddress) return 'done'
  if (status.kind === 'reimport' && status.migration.newAddress === target.newAddress) return 'old-profile'
  return 'other-profile'
}
