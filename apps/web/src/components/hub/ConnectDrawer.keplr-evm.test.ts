// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Secp256k1, keccak256, ripemd160, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBech32 } from '@cosmjs/encoding';

/*
 * The Keplr EVM setup, end to end in the real drawer, against a Keplr that
 * behaves like the real one: a profile keeps the key it already used, and a
 * profile switch fires keplr_keystorechange. The story is the testnet account
 * whose migration moved it to lumera1j62yl8… (MsgClaimLegacyAccount, h5910159).
 */

const OLD_KEY = fromBase64('Al6fPlAtQSlJHyrqdAyRPdnm1JFtPHKvtjeX2FwPMcRw');
const NEW_KEY = fromBase64('A34auy+qiD7XvOF/sVhTOE2klcF2NhPuEnJM5Q28gVcg');
const OTHER_KEY = Secp256k1.compressPubkey(Secp256k1.makeKeypair(new Uint8Array(32).fill(3)).pubkey);
const LEGACY = 'lumera1j5hzy4mq76rv5hwhnc4qvnvgnqx2kz6tzv5wtj';
const MIGRATED = 'lumera1j62yl8f48tdcu3v6rwfypzcntcyng2l6xkqrw9';

const evmAddress = (pubkey: Uint8Array) =>
  toBech32('lumera', keccak256(Secp256k1.uncompressPubkey(pubkey).slice(1)).slice(-20));
const cosmosAddress = (pubkey: Uint8Array) => toBech32('lumera', ripemd160(sha256(pubkey)));

const mocks = vi.hoisted(() => ({
  connectWallet: vi.fn(async () => true),
  flash: vi.fn(),
  closeDrawer: vi.fn(),
  watch: vi.fn(),
}));

vi.mock('@/contants/network', () => ({
  CHAIN_ID: 'lumera-testnet-2',
  DENOM: 'ulume',
  EVM_CHAIN_ID: 76857769,
  IS_EVM_NETWORK: true,
  NETWORK_LABEL: 'Testnet',
  REST_AI_URL: 'https://lcd-testnet.lumeraprotocol.com',
  RPC_ENDPOINT: 'https://rpc-testnet.lumeraprotocol.com',
}));
vi.mock('@/hooks/useConnectWallet', () => ({
  default: () => ({ connectWallet: mocks.connectWallet, connectingWallet: null, error: null }),
}));
vi.mock('@/utils/evm', () => ({
  addLumeraToMetaMask: vi.fn(),
  resolveMetaMaskProvider: async () => null,
}));
// The chain: one migration record, and the accounts that exist.
vi.mock('@/utils/api', () => ({
  getQuiet: vi.fn(async (path: string) => {
    const record = /\/migration_record\/(\w+)$/.exec(path);
    if (record) {
      return {
        data: {
          record:
            record[1] === LEGACY
              ? { legacy_address: LEGACY, new_address: MIGRATED, migration_height: '5910159' }
              : null,
        },
      };
    }
    const account = /\/accounts\/(\w+)$/.exec(path);
    if (account && [LEGACY, MIGRATED].includes(account[1])) return { data: { account: { address: account[1] } } };
    throw { statusCode: 404, message: 'account not found' };
  }),
}));
vi.mock('next/image', () => ({ default: (props: { alt: string }) => React.createElement('img', { alt: props.alt }) }));
vi.mock('@lumera-hub/ui/src/hub/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lumera-hub/ui/src/hub/session')>();
  const hub = {
    drawer: { kind: 'connect' },
    pendingIntent: null,
    flash: mocks.flash,
    closeDrawer: mocks.closeDrawer,
    watch: mocks.watch,
  };
  return { ...actual, useHub: () => hub };
});

const { ConnectDrawer } = await import('./ConnectDrawer');

/** Keplr with the chain on the EVM settings; `active` is the profile's key. */
const installKeplr = () => {
  const keplr = {
    active: OLD_KEY,
    experimentalSuggestChain: vi.fn(async () => undefined),
    enable: vi.fn(async () => undefined),
    getKey: vi.fn(async () => ({
      algo: 'ethsecp256k1',
      bech32Address: evmAddress(keplr.active),
      pubKey: keplr.active,
    })),
  };
  (window as unknown as { keplr: unknown }).keplr = keplr;
  return keplr;
};

const switchProfile = async (keplr: ReturnType<typeof installKeplr>, key: Uint8Array) => {
  keplr.active = key;
  await act(async () => {
    window.dispatchEvent(new Event('keplr_keystorechange'));
  });
};

describe('ConnectDrawer — Keplr EVM setup for a migrated account', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    delete (window as unknown as { keplr?: unknown }).keplr;
  });

  it('explains the re-import, then connects as soon as Keplr switches to the re-imported profile', async () => {
    const keplr = installKeplr();
    render(React.createElement(ConnectDrawer));

    fireEvent.click(screen.getByRole('button', { name: 'Add Lumera Testnet (EVM) to Keplr' }));

    // The old profile only shows its key's EVM-style address, which is empty.
    expect(await screen.findByText(/an address nothing was moved to/)).toBeTruthy();
    expect(screen.getByText(/Waiting for you to switch Keplr profiles/)).toBeTruthy();
    expect(screen.getByText(/in an EVM/).textContent).toContain('0x9694');
    // Already on the EVM settings: nothing to suggest again.
    expect(keplr.experimentalSuggestChain).not.toHaveBeenCalled();

    // An unrelated profile is named as such, and nothing connects.
    await switchProfile(keplr, OTHER_KEY);
    expect(await screen.findByText(/which is not\s+your migrated account/)).toBeTruthy();
    expect(mocks.connectWallet).not.toHaveBeenCalled();

    // The profile re-imported from the recovery phrase holds the new key.
    await switchProfile(keplr, NEW_KEY);
    await waitFor(() => expect(mocks.connectWallet).toHaveBeenCalledWith('keplr-extension'));
    expect(mocks.flash).toHaveBeenCalledWith(expect.stringMatching(/migrated account lumera1j6/), 'ok');
    expect(mocks.closeDrawer).toHaveBeenCalled();
    expect(screen.queryByText(/an address nothing was moved to/)).toBeNull();
  });

  it('leaves Keplr alone for an account that was never migrated', async () => {
    const keplr = installKeplr();
    keplr.active = OTHER_KEY;
    keplr.getKey.mockImplementation(async () => ({
      algo: 'secp256k1',
      bech32Address: cosmosAddress(OTHER_KEY),
      pubKey: OTHER_KEY,
    }));
    render(React.createElement(ConnectDrawer));

    fireEvent.click(screen.getByRole('button', { name: 'Add Lumera Testnet (EVM) to Keplr' }));

    expect(await screen.findByText(/was not migrated to/)).toBeTruthy();
    expect(keplr.experimentalSuggestChain).not.toHaveBeenCalled();
    expect(mocks.connectWallet).not.toHaveBeenCalled();
  });
});
