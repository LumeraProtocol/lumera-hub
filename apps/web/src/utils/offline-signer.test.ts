import { describe, expect, it, vi } from 'vitest';
import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { isOfflineDirectSigner, type OfflineDirectSigner } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { AuthInfo, type SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import {
  mislabelledEthKey,
  nativeProviderFor,
  resolveOfflineSigner,
  signerHasAddress,
  signsWithEthKey,
  type MinimalSigner,
} from './offline-signer';

/** Amino JSON for a compressed secp256k1 key, as a wallet returns it with a signature. */
const encodeSecp256k1Pubkey = (pubkey: Uint8Array) => ({
  type: 'tendermint/PubKeySecp256k1',
  value: toBase64(pubkey),
});

const signerFor = (...addresses: string[]) => ({
  getAccounts: vi.fn(async () => addresses.map((address) => ({ address }))),
});

const ME = 'lumera1v69uuyn2vujg9f9svy2u47tft925yj6aaaaaaa';
const OTHER = 'lumera1someoneelsezzzzzzzzzzzzzzzzzzzzzzzzzzz';

describe('nativeProviderFor', () => {
  it('finds each wallet under its own name', () => {
    const keplr = {};
    const leap = {};
    expect(nativeProviderFor('Keplr Extension', { keplr, leap })).toBe(keplr);
    expect(nativeProviderFor('leap-extension', { keplr, leap })).toBe(leap);
  });

  it('has no provider for an unknown or absent wallet', () => {
    expect(nativeProviderFor('Ledger', { keplr: {} })).toBeNull();
    expect(nativeProviderFor(undefined, { keplr: {} })).toBeNull();
    expect(nativeProviderFor('keplr', {})).toBeNull();
  });
});

describe('signerHasAddress', () => {
  it('is true only when the account is present', async () => {
    expect(await signerHasAddress(signerFor(OTHER, ME), ME)).toBe(true);
    expect(await signerHasAddress(signerFor(OTHER), ME)).toBe(false);
  });

  it('treats a signer that cannot list accounts as unusable', async () => {
    const broken = { getAccounts: vi.fn(async () => { throw new Error('locked') }) };
    expect(await signerHasAddress(broken, ME)).toBe(false);
  });
});

describe('resolveOfflineSigner', () => {
  const chainId = 'lumera-testnet-2';

  it("prefers the wallet's own auto signer, enabling the chain first", async () => {
    const auto = signerFor(ME);
    const enable = vi.fn(async () => undefined);
    const wallet = { getOfflineSigner: vi.fn() };

    const signer = await resolveOfflineSigner({
      wallet,
      chainId,
      address: ME,
      walletName: 'Keplr',
      win: { keplr: { enable, getOfflineSignerAuto: async () => auto } },
    });

    expect(signer).toBe(auto);
    expect(enable).toHaveBeenCalledWith(chainId);
    expect(wallet.getOfflineSigner).not.toHaveBeenCalled();
  });

  it('falls back to an amino signer when the auto one holds a different account', async () => {
    const amino = signerFor(ME);
    const wallet = { getOfflineSigner: vi.fn(async () => amino) };

    const signer = await resolveOfflineSigner({
      wallet,
      chainId,
      address: ME,
      walletName: 'Keplr',
      win: { keplr: { getOfflineSignerAuto: async () => signerFor(OTHER) } },
    });

    expect(signer).toBe(amino);
    expect(wallet.getOfflineSigner).toHaveBeenCalledWith(chainId, 'amino');
  });

  it('falls back to the default signer when there is no native provider', async () => {
    const fallback = signerFor(ME);
    const wallet = {
      getOfflineSigner: vi.fn(async (_id: string, type?: string) =>
        type === 'amino' ? Promise.reject(new Error('unsupported')) : fallback,
      ),
    };

    expect(
      await resolveOfflineSigner({ wallet, chainId, address: ME, walletName: 'Ledger', win: {} }),
    ).toBe(fallback);
  });

  it('explains the mismatch rather than letting CosmJS throw its opaque error', async () => {
    const wallet = { getOfflineSigner: vi.fn(async () => signerFor(OTHER)) };

    await expect(
      resolveOfflineSigner({ wallet, chainId, address: ME, walletName: 'Keplr', win: {} }),
    ).rejects.toThrow(/cannot sign for lumera1v69/);
  });

  it('asks to connect when no signer loads at all', async () => {
    const wallet = { getOfflineSigner: vi.fn(async () => { throw new Error('no wallet') }) };

    await expect(
      resolveOfflineSigner({ wallet, chainId, address: ME, walletName: 'Keplr', win: {} }),
    ).rejects.toThrow('Please connect wallet before using');
  });

  it('takes the first signer that loads when no address is known yet', async () => {
    const any = signerFor(OTHER);
    const wallet = { getOfflineSigner: vi.fn(async () => any) };

    expect(
      await resolveOfflineSigner({ wallet, chainId, address: '', walletName: '', win: {} }),
    ).toBe(any);
  });
});

describe('a signer that cannot be checked', () => {
  it('is accepted rather than blocked', async () => {
    // Refusing to sign because verification was impossible would lock out an
    // unusual wallet for no gain — CosmJS still checks before it signs.
    const opaque: MinimalSigner = { kind: 'no-getAccounts' } as MinimalSigner;
    const wallet = { getOfflineSigner: vi.fn(async () => opaque) };

    expect(
      await resolveOfflineSigner({
        wallet,
        chainId: 'lumera-testnet-2',
        address: 'lumera1anything',
        walletName: 'Keplr',
        win: {},
      }),
    ).toBe(opaque);
  });
});

/*
 * The testnet EVM migration: an account whose address is the Ethereum-style
 * (keccak) address of its key. Keplr's CosmJS signer lists it as plain
 * "secp256k1", and signing it as such put /cosmos.crypto.secp256k1.PubKey in the
 * transaction — which the chain rejects with "pubKey does not match signer
 * address … invalid pubkey". Vectors: a real lumera-testnet-2 account.
 */
describe('Ethereum-style keys a signer mislabels', () => {
  const PUBKEY = fromBase64('A5K0iClRfHPHY1TJwmkj6UGs1U7hwjvOKj7UXGdeGYqZ');
  const ETH_ADDRESS = 'lumera18ulqt4jzn5ch3h4yt8xn9rd9wuufvftxu237hj'; // keccak(pubkey)
  const COSMOS_ADDRESS = 'lumera1rqx08dfy2fh09lgp6pp6687peyly6gtykqk27a'; // ripemd160(sha256(pubkey))
  const chainId = 'lumera-testnet-2';

  // Shaped like Keplr's CosmJSOfflineSigner: a class, methods on the prototype,
  // every key reported as "secp256k1".
  class KeplrLikeSigner {
    constructor(readonly address: string) {}
    async getAccounts() {
      return [{ address: this.address, algo: 'secp256k1' as const, pubkey: PUBKEY }];
    }
    async signDirect(_signer: string, signDoc: SignDoc) {
      return {
        signed: signDoc,
        signature: { pub_key: encodeSecp256k1Pubkey(PUBKEY), signature: toBase64(new Uint8Array(64)) },
      };
    }
  }

  const signedPubkeyType = async (signer: unknown, address: string) => {
    const client = await SigningStargateClient.offline(signer as OfflineDirectSigner);
    const tx = await client.sign(
      address,
      [{ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: { fromAddress: address, toAddress: address, amount: [] } }],
      { amount: [], gas: '200000' },
      '',
      { accountNumber: BigInt(9189), sequence: 5, chainId },
    );
    return AuthInfo.decode(tx.authInfoBytes).signerInfos[0].publicKey?.typeUrl;
  };

  const resolve = (signer: MinimalSigner, address: string) =>
    resolveOfflineSigner({
      wallet: { getOfflineSigner: vi.fn() },
      chainId,
      address,
      walletName: 'Keplr',
      win: { keplr: { getOfflineSignerAuto: async () => signer } },
    });

  it('spots the mislabel by the address, and only then', () => {
    expect(mislabelledEthKey({ address: ETH_ADDRESS, algo: 'secp256k1', pubkey: PUBKEY })).toBe(true);
    expect(mislabelledEthKey({ address: COSMOS_ADDRESS, algo: 'secp256k1', pubkey: PUBKEY })).toBe(false);
    expect(mislabelledEthKey({ address: ETH_ADDRESS, algo: 'eth_secp256k1', pubkey: PUBKEY })).toBe(false);
    // Missing, uncompressed or malformed data is never a reason to relabel.
    expect(mislabelledEthKey({ address: ETH_ADDRESS })).toBe(false);
    expect(mislabelledEthKey({ address: ETH_ADDRESS, pubkey: new Uint8Array(65) })).toBe(false);
    expect(mislabelledEthKey({ address: ME, pubkey: PUBKEY })).toBe(false);
  });

  it('signs an Ethereum-style key with the EVM public-key type', async () => {
    const raw = new KeplrLikeSigner(ETH_ADDRESS);
    // Unfixed, this is the transaction the chain rejected.
    expect(await signedPubkeyType(raw, ETH_ADDRESS)).toBe('/cosmos.crypto.secp256k1.PubKey');

    const signer = await resolve(raw, ETH_ADDRESS);
    expect(signer).not.toBe(raw);
    expect((await signer.getAccounts!())[0].algo).toBe('eth_secp256k1');
    expect(await signsWithEthKey(signer, ETH_ADDRESS)).toBe(true);
    // Still a direct signer: methods were bound, not lost to a spread.
    expect(isOfflineDirectSigner(signer as OfflineDirectSigner)).toBe(true);
    expect(await signedPubkeyType(signer, ETH_ADDRESS)).toBe('/cosmos.evm.crypto.v1.ethsecp256k1.PubKey');
  });

  it('leaves a plain Cosmos key, and its signer, exactly as they were', async () => {
    const raw = new KeplrLikeSigner(COSMOS_ADDRESS);
    const signer = await resolve(raw, COSMOS_ADDRESS);
    expect(signer).toBe(raw);
    expect(await signsWithEthKey(signer, COSMOS_ADDRESS)).toBe(false);
    expect(await signedPubkeyType(signer, COSMOS_ADDRESS)).toBe('/cosmos.crypto.secp256k1.PubKey');
  });
});
