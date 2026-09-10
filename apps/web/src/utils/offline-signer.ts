/*
 * Choosing a signer the connected account can actually sign with.
 *
 * Lumera is migrating accounts to EVM-compatible keys. An `eth_secp256k1`
 * account cannot sign with the protobuf (direct) signer a Cosmos wallet hands
 * out by default — the wallet derives a different address for it, CosmJS finds
 * no matching account and throws "Failed to retrieve account from signer",
 * which says nothing about the cause.
 *
 * Keplr and Leap expose getOfflineSignerAuto for exactly this: it returns the
 * signer matching the account's key type, amino-only for the EVM ones. We
 * prefer it, fall back to asking interchain-kit for an amino signer, and fall
 * back again to whatever it gives us by default.
 */

export type MinimalSigner = {
  getAccounts?: () => Promise<readonly { address: string }[]>;
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
    if (!address || (await signerHasAddress(signer, address))) return signer;
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
