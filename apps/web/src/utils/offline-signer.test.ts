import { describe, expect, it, vi } from 'vitest';
import {
  nativeProviderFor,
  resolveOfflineSigner,
  signerHasAddress,
  type MinimalSigner,
} from './offline-signer';

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
