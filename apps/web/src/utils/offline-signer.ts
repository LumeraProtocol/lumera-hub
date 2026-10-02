/*
 * Choosing a signer the connected account can actually sign with.
 *
 * Lumera is migrating accounts to EVM-compatible keys. An `eth_secp256k1`
 * account cannot sign with the protobuf (direct) signer a Cosmos wallet hands
 * out by default — the wallet derives a different address for it, CosmJS finds
 * no matching account and throws "Failed to retrieve account from signer",
 * which says nothing about the cause.
 *
 * Keplr and Leap expose getOfflineSignerAuto, which returns a signer for the
 * account the wallet shows for this chain (amino-only for a Ledger key). We
 * prefer it, fall back to asking interchain-kit for an amino signer, and fall
 * back again to whatever it gives us by default.
 *
 * Whichever signer is chosen, its accounts are checked for an Ethereum-style
 * key the signer mislabels (see withEthKeyAlgo): Keplr's CosmJS signer reports
 * every key as plain "secp256k1", even on a chain where it signs with an EVM
 * key, and CosmJS then puts the wrong public-key type in the transaction.
 */

import { Secp256k1, keccak256 } from '@cosmjs/crypto';
import { fromBech32 } from '@cosmjs/encoding';

/** An account as a CosmJS signer lists it. */
export type SignerAccount = { address: string; algo?: string; pubkey?: Uint8Array };

export type MinimalSigner = {
  getAccounts?: () => Promise<readonly SignerAccount[]>;
};

const ETH_ALGOS = new Set(['eth_secp256k1', 'ethsecp256k1']);

/** The signer reports this account as an Ethereum-style (eth_secp256k1) key. */
export const isEthKeyAccount = (account: SignerAccount | undefined): boolean =>
  ETH_ALGOS.has(account?.algo ?? '');

/**
 * An account whose address is the Ethereum-style (keccak) address of its key,
 * while the signer calls the key plain "secp256k1".
 *
 * Signed as reported, CosmJS would label the key /cosmos.crypto.secp256k1.PubKey;
 * the chain derives the Cosmos-style address from that, finds it is not the
 * signer, and rejects the transaction: "pubKey does not match signer address …
 * invalid pubkey" (code 8). Anything unexpected about the account counts as
 * "no" — this must never turn a working signer into a failing one.
 */
export const mislabelledEthKey = (account: SignerAccount): boolean => {
  try {
    if (isEthKeyAccount(account)) return false;
    const pubkey = account.pubkey;
    if (!(pubkey instanceof Uint8Array) || pubkey.length !== 33) return false;
    const ethAddress = keccak256(Secp256k1.uncompressPubkey(pubkey).slice(1)).slice(-20);
    const { data } = fromBech32(account.address);
    return data.length === ethAddress.length && data.every((byte, i) => byte === ethAddress[i]);
  } catch {
    return false;
  }
};

type FullSigner = MinimalSigner & {
  signDirect?: (...args: never[]) => unknown;
  signAmino?: (...args: never[]) => unknown;
};

/**
 * The same signer, reporting Ethereum-style keys as "eth_secp256k1" so CosmJS
 * labels them /cosmos.evm.crypto.v1.ethsecp256k1.PubKey. The signatures are
 * untouched: the wallet already signs these keys the Ethereum way.
 *
 * Methods are bound rather than spread — Keplr's signer is a class, and a
 * spread would drop signDirect and quietly turn it into an amino-only signer.
 */
export const withEthKeyAlgo = (signer: MinimalSigner): MinimalSigner => {
  const source = signer as FullSigner;
  const wrapped: FullSigner = {
    getAccounts: async () => {
      const accounts = (await source.getAccounts?.()) ?? [];
      return accounts.map((a) => (mislabelledEthKey(a) ? { ...a, algo: 'eth_secp256k1' } : a));
    },
  };
  if (typeof source.signDirect === 'function') wrapped.signDirect = source.signDirect.bind(source);
  if (typeof source.signAmino === 'function') wrapped.signAmino = source.signAmino.bind(source);
  return wrapped;
};

/** The signer, relabelled only when one of its accounts needs it; otherwise unchanged. */
const labelled = async (signer: MinimalSigner): Promise<MinimalSigner> => {
  if (typeof signer.getAccounts !== 'function') return signer;
  try {
    const accounts = await signer.getAccounts();
    return Array.isArray(accounts) && accounts.some(mislabelledEthKey) ? withEthKeyAlgo(signer) : signer;
  } catch {
    return signer;
  }
};

/** The signer signs for `address` with an Ethereum-style key. */
export const signsWithEthKey = async (signer: MinimalSigner, address: string | undefined): Promise<boolean> => {
  if (typeof signer.getAccounts !== 'function') return false;
  try {
    const accounts = await signer.getAccounts();
    return isEthKeyAccount(accounts.find((a) => a.address === address) ?? accounts[0]);
  } catch {
    return false;
  }
};

type NativeProvider = {
  enable?: (chainId: string) => Promise<void>;
  getOfflineSignerAuto?: (chainId: string) => Promise<MinimalSigner> | MinimalSigner;
};

type KitWallet = {
  getOfflineSigner: (chainId: string, preferredSignType?: string) => Promise<MinimalSigner>;
};

/** Keplr and Leap both sit on window under their own name. */
export const nativeProviderFor = (
  walletName: string | undefined,
  win: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
): NativeProvider | null => {
  const name = (walletName ?? '').toLowerCase();
  const key = name.includes('leap') ? 'leap' : name.includes('keplr') ? 'keplr' : null;
  return key ? ((win[key] as NativeProvider) ?? null) : null;
};

/**
 * Whether this signer is known to be wrong for the address.
 *
 * Only a signer that lists its accounts and does not include the address is
 * rejected. One that cannot be asked is accepted: refusing to sign because we
 * could not check is worse than letting the attempt proceed, and an unusual
 * wallet should not be locked out by a verification step.
 */
export const signerHasAddress = async (
  signer: MinimalSigner,
  address: string,
): Promise<boolean> => {
  if (typeof signer.getAccounts !== 'function') return true;
  try {
    const accounts = await signer.getAccounts();
    if (!Array.isArray(accounts)) return true;
    return accounts.some((a) => a?.address === address);
  } catch {
    return false;
  }
};

/**
 * The first signer that can sign for `address`.
 *
 * Each candidate is checked against the address rather than assumed to work,
 * because the failure this exists to prevent is precisely a signer that loads
 * fine and holds the wrong account.
 */
export const resolveOfflineSigner = async ({
  wallet,
  chainId,
  address,
  walletName,
  win,
}: {
  wallet: KitWallet;
  chainId: string;
  /** Undefined before a wallet reports one; then any signer that loads will do. */
  address: string | undefined;
  walletName?: string;
  win?: Record<string, unknown>;
}): Promise<MinimalSigner> => {
  const native = nativeProviderFor(walletName, win);

  const candidates: Array<() => Promise<MinimalSigner | null>> = [
    async () => {
      if (!native?.getOfflineSignerAuto) return null;
      await native.enable?.(chainId).catch(() => undefined);
      return (await native.getOfflineSignerAuto(chainId)) ?? null;
    },
    async () => wallet.getOfflineSigner(chainId, 'amino').catch(() => null),
    async () => wallet.getOfflineSigner(chainId).catch(() => null),
  ];

  let firstLoaded: MinimalSigner | null = null;

  for (const load of candidates) {
    const signer = await load().catch(() => null);
    if (!signer) continue;
    firstLoaded ??= signer;
    if (!address || (await signerHasAddress(signer, address))) return labelled(signer);
  }

  if (firstLoaded) {
    throw new Error(
      `The connected wallet cannot sign for ${address}. Its signer holds a different account — ` +
        'this usually means the account was migrated to an EVM key that the wallet is not offering ' +
        'for this chain. Reconnect, or select the matching account in the wallet.',
    );
  }

  throw new Error('Please connect wallet before using');
};
