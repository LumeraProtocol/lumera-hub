import { describe, expect, it, vi } from 'vitest';
import { Secp256k1, keccak256 } from '@cosmjs/crypto';
import { fromBase64, toBech32 } from '@cosmjs/encoding';

vi.mock('@/contants/network', () => ({
  CHAIN_ID: 'lumera-testnet-2',
  DENOM: 'ulume',
  EVM_CHAIN_ID: 76857769,
  NETWORK_LABEL: 'Testnet',
  REST_AI_URL: 'https://lcd-testnet.lumeraprotocol.com',
  RPC_ENDPOINT: 'https://rpc-testnet.lumeraprotocol.com',
}));

const {
  addLumeraEvmToKeplr,
  canAddLumeraEvmToKeplr,
  evmAddressOf,
  isMissingChainError,
  judgeProfileSwitch,
  keplrChainState,
  keplrMigrationStatus,
  keplrUsesEvmKey,
  legacyAddressOf,
  lumeraEvmChainInfo,
  migrationFor,
} = await import('./keplr-evm');

/*
 * Real lumera-testnet-2 vectors: the keys in the account's MsgClaimLegacyAccount
 * (height 5910159). The old key signed the legacy proof; the new one the EVM proof.
 */
const OLD_KEY = fromBase64('Al6fPlAtQSlJHyrqdAyRPdnm1JFtPHKvtjeX2FwPMcRw');
const NEW_KEY = fromBase64('A34auy+qiD7XvOF/sVhTOE2klcF2NhPuEnJM5Q28gVcg');
const LEGACY = 'lumera1j5hzy4mq76rv5hwhnc4qvnvgnqx2kz6tzv5wtj'; // old key, Cosmos-style
const MIGRATED = 'lumera1j62yl8f48tdcu3v6rwfypzcntcyng2l6xkqrw9'; // new key, EVM-style
const OLD_KEY_EVM = 'lumera1g4sm20km7v3uw22efrtwpyy28ja3sc3qxhs8p3'; // old key, EVM-style: empty

const evmAddress = (pubkey: Uint8Array) =>
  toBech32('lumera', keccak256(Secp256k1.uncompressPubkey(pubkey).slice(1)).slice(-20));

/**
 * Keplr as it behaves: a profile keeps the key it has used for the chain, a
 * suggestion for a chain it already has changes nothing, and the EVM settings
 * only change how that key's address is formed.
 */
const fakeKeplr = (profileKey: Uint8Array, settings: 'cosmos' | 'evm' | 'removed') => {
  const state = { settings };
  return {
    state,
    experimentalSuggestChain: vi.fn(async () => {
      if (state.settings === 'removed') state.settings = 'evm';
    }),
    enable: vi.fn(async () => undefined),
    getKey: vi.fn(async () => {
      if (state.settings === 'removed') throw new Error('There is no modular chain info for lumera-testnet-2');
      return state.settings === 'evm'
        ? { algo: 'ethsecp256k1', bech32Address: evmAddress(profileKey), pubKey: profileKey }
        : { algo: 'secp256k1', bech32Address: legacyAddressOf(profileKey), pubKey: profileKey };
    }),
  };
};

/** The chain's REST answers: the one migration record, and which accounts exist. */
const chain = (records: Record<string, string> = { [LEGACY]: MIGRATED }, accounts = [LEGACY, MIGRATED]) =>
  vi.fn(async (path: string) => {
    const record = /\/migration_record\/(\w+)$/.exec(path);
    if (record) {
      const to = records[record[1]];
      return { record: to ? { legacy_address: record[1], new_address: to, migration_height: '5910159' } : null };
    }
    const account = /\/accounts\/(\w+)$/.exec(path);
    if (account && accounts.includes(account[1])) return { account: { address: account[1] } };
    throw { statusCode: 404, message: 'account not found' };
  });

describe('address derivation', () => {
  it('matches what the chain recorded for this migration', () => {
    expect(legacyAddressOf(OLD_KEY)).toBe(LEGACY);
    expect(evmAddress(NEW_KEY)).toBe(MIGRATED);
    expect(evmAddress(OLD_KEY)).toBe(OLD_KEY_EVM);
    expect(evmAddressOf(MIGRATED)).toBe('0x96944f9d353adb8e459a1b92408b135e09342bfa');
  });
});

describe('lumeraEvmChainInfo', () => {
  it('asks Keplr for the EVM key path and cosmos/evm key handling', () => {
    const info = lumeraEvmChainInfo();
    expect(info).toMatchObject({ chainId: 'lumera-testnet-2', chainName: 'Lumera Testnet', bip44: { coinType: 60 } });
    expect(info.features).toEqual(['eth-address-gen', 'eth-key-sign', 'eth-secp256k1-cosmos']);
  });
});

describe('migrationFor', () => {
  it('reads the record, null when not migrated, and never guesses on a failed read', async () => {
    await expect(migrationFor(LEGACY, chain())).resolves.toMatchObject({ newAddress: MIGRATED, height: '5910159' });
    await expect(migrationFor(MIGRATED, chain())).resolves.toBeNull();
    await expect(migrationFor(LEGACY, async () => ({ code: 12, message: 'Not Implemented' }))).rejects.toThrow();
  });
});

describe('addLumeraEvmToKeplr', () => {
  it('leaves Keplr alone for an account that was never migrated', async () => {
    const keplr = fakeKeplr(OLD_KEY, 'cosmos');
    const result = await addLumeraEvmToKeplr(keplr, chain({}));
    expect(result).toEqual({ kind: 'not-migrated', keplrAddress: LEGACY, legacyAddress: LEGACY });
    expect(keplr.experimentalSuggestChain).not.toHaveBeenCalled();
  });

  it('notices Keplr kept its old settings for a migrated account', async () => {
    const result = await addLumeraEvmToKeplr(fakeKeplr(OLD_KEY, 'cosmos'), chain());
    expect(result).toMatchObject({ kind: 'kept-existing', keplrAddress: LEGACY, migration: { newAddress: MIGRATED } });
  });

  it('does not call it done when the old profile only shows an empty EVM-style address', async () => {
    // What happened on the real wallet: the chain was removed, re-added with the
    // EVM settings, and Keplr kept the old key — showing lumera1g4sm20…, empty.
    const keplr = fakeKeplr(OLD_KEY, 'removed');
    const result = await addLumeraEvmToKeplr(keplr, chain());
    expect(keplr.experimentalSuggestChain).toHaveBeenCalledWith(expect.objectContaining({ bip44: { coinType: 60 } }));
    expect(result).toMatchObject({ kind: 'reimport', keplrAddress: OLD_KEY_EVM, migration: { newAddress: MIGRATED } });
  });

  it('is done once a profile holds the new key', async () => {
    // A profile re-imported from the recovery phrase derives the coin-type-60 key.
    const keplr = fakeKeplr(NEW_KEY, 'evm');
    await expect(addLumeraEvmToKeplr(keplr, chain())).resolves.toEqual({ kind: 'ready', keplrAddress: MIGRATED });
    expect(keplr.experimentalSuggestChain).not.toHaveBeenCalled();
  });

  it('warns when the EVM settings hide an unmigrated legacy account', async () => {
    const result = await addLumeraEvmToKeplr(fakeKeplr(OLD_KEY, 'evm'), chain({}));
    expect(result).toEqual({ kind: 'not-migrated', keplrAddress: OLD_KEY_EVM, legacyAddress: LEGACY });
  });

  it('needs Keplr and an EVM network', async () => {
    await expect(addLumeraEvmToKeplr(undefined, chain())).rejects.toThrow(/Keplr was not detected/);
    expect(canAddLumeraEvmToKeplr({})).toBe(false);
    expect(canAddLumeraEvmToKeplr({ keplr: { experimentalSuggestChain: () => undefined } })).toBe(true);
  });
});

describe('keplrChainState', () => {
  it('tells removed, EVM and Cosmos settings apart, and never mistakes a locked Keplr for removal', async () => {
    await expect(keplrChainState(fakeKeplr(OLD_KEY, 'removed'))).resolves.toBe('removed');
    await expect(keplrChainState(fakeKeplr(OLD_KEY, 'evm'))).resolves.toBe('evm');
    await expect(keplrChainState(fakeKeplr(OLD_KEY, 'cosmos'))).resolves.toBe('cosmos');
    const locked = { getKey: async () => { throw new Error('Request rejected'); } };
    await expect(keplrChainState(locked)).resolves.toBe('unknown');
    expect(isMissingChainError(new Error('There is no chain info for x'))).toBe(true);
    expect(keplrUsesEvmKey({ algo: 'eth_secp256k1' })).toBe(true);
  });
});

describe('judgeProfileSwitch', () => {
  const target = { legacyAddress: LEGACY, newAddress: MIGRATED };
  const status = (profileKey: Uint8Array, records?: Record<string, string>) =>
    keplrMigrationStatus(fakeKeplr(profileKey, 'evm'), chain(records));

  it('is done once Keplr is on the profile re-imported from the recovery phrase', async () => {
    expect(judgeProfileSwitch(target, await status(NEW_KEY))).toBe('done');
  });

  it('keeps waiting while Keplr is still on the pre-migration profile', async () => {
    expect(judgeProfileSwitch(target, await status(OLD_KEY))).toBe('old-profile');
    expect(judgeProfileSwitch(target, null)).toBe('old-profile');
  });

  it('says so when the reader switched to an unrelated profile', async () => {
    const unrelated = Secp256k1.makeKeypair(new Uint8Array(32).fill(3)).pubkey;
    expect(judgeProfileSwitch(target, await status(Secp256k1.compressPubkey(unrelated), {}))).toBe('other-profile');
  });
});
