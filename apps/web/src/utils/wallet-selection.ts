export const METAMASK_WALLET_NAME = 'metamask';
export const KEPLR_WALLET_NAME = 'keplr-extension';
export const INTERCHAIN_WALLET_STORAGE_KEY = 'interchain-kit-store';

export type ActiveWalletMode = 'none' | 'evm' | 'cosmos';

interface ActiveWalletModeOptions {
  selectedWallet: string;
  isEvmNetwork: boolean;
}

export const getActiveWalletMode = ({
  selectedWallet,
  isEvmNetwork,
}: ActiveWalletModeOptions): ActiveWalletMode => {
  if (!isEvmNetwork) return 'cosmos';
  if (selectedWallet === METAMASK_WALLET_NAME) return 'evm';
  if (selectedWallet === KEPLR_WALLET_NAME) return 'cosmos';
  return 'none';
};

interface ActiveWalletAddressOptions {
  mode: ActiveWalletMode;
  evmAddress?: string;
  cosmosAddress?: string;
}

export const getActiveWalletAddress = ({
  mode,
  evmAddress,
  cosmosAddress,
}: ActiveWalletAddressOptions) => {
  if (mode === 'evm') return evmAddress || '';
  if (mode === 'cosmos') return cosmosAddress || '';
  return '';
};

interface PreferredWalletSelectionOptions {
  currentSelection: string;
  isKeplrInstalled: boolean;
  isMetaMaskInstalled: boolean;
}

export const getPreferredWalletSelection = ({
  currentSelection,
  isKeplrInstalled,
  isMetaMaskInstalled,
}: PreferredWalletSelectionOptions) => {
  if (currentSelection === KEPLR_WALLET_NAME && isKeplrInstalled) {
    return KEPLR_WALLET_NAME;
  }
  if (currentSelection === METAMASK_WALLET_NAME && isMetaMaskInstalled) {
    return METAMASK_WALLET_NAME;
  }
  if (isKeplrInstalled) return KEPLR_WALLET_NAME;
  if (isMetaMaskInstalled) return METAMASK_WALLET_NAME;
  return '';
};

interface AlternativeWalletOptions {
  currentWallet: string;
  isKeplrInstalled: boolean;
  isMetaMaskInstalled: boolean;
}

export const getAlternativeWalletName = ({
  currentWallet,
  isKeplrInstalled,
  isMetaMaskInstalled,
}: AlternativeWalletOptions) => {
  if (currentWallet === KEPLR_WALLET_NAME && isMetaMaskInstalled) {
    return METAMASK_WALLET_NAME;
  }
  if (currentWallet === METAMASK_WALLET_NAME && isKeplrInstalled) {
    return KEPLR_WALLET_NAME;
  }
  return '';
};

interface KeplrConnectionState {
  walletState?: string;
  account?: { address?: string } | null;
  errorMessage?: string;
}

/**
 * Judges whether an interchain-kit chain-wallet state represents a live,
 * usable Keplr connection. Returns a user-presentable problem description, or
 * null when the connection is genuinely live. Needed because interchain-kit's
 * connect() resolves even after a rejection or account-read failure — the
 * outcome only exists in this state object. State values mirror
 * @interchain-kit/core's WalletState string enum.
 */
export const getKeplrConnectionIssue = (
  state?: KeplrConnectionState | null,
): string | null => {
  if (!state || state.walletState === 'NotExist') {
    // interchain-kit probes for the extension once at startup; when Keplr
    // injects later the stored state stays NotExist with the raw library
    // message 'Client not exist'. Only a reload re-runs that probe.
    return 'Keplr was not detected when the app loaded. Reload the page and try again.';
  }
  if (state.walletState !== 'Connected') {
    return state.errorMessage || 'Keplr did not connect.';
  }
  if (!state.account?.address) {
    return 'Keplr did not return a connected account.';
  }
  return null;
};

interface PersistedInterchainWalletState {
  state?: {
    chainWalletState?: Array<{
      walletName?: string;
      walletState?: string;
      account?: unknown;
      [key: string]: unknown;
    }>;
    currentWalletName?: string;
    currentChainName?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const disconnectPersistedInterchainWallet = (
  serializedState: string,
  walletName: string,
) => {
  let persisted: PersistedInterchainWalletState;
  try {
    persisted = JSON.parse(serializedState) as PersistedInterchainWalletState;
  } catch {
    return serializedState;
  }

  const chainWalletState = persisted.state?.chainWalletState;
  if (!persisted.state || !Array.isArray(chainWalletState)) return serializedState;

  let changed = false;
  persisted.state.chainWalletState = chainWalletState.map((walletState) => {
    if (walletState.walletName !== walletName) return walletState;
    if (walletState.walletState === 'Disconnected' && walletState.account == null) {
      return walletState;
    }
    changed = true;
    return {
      ...walletState,
      walletState: 'Disconnected',
      account: null,
    };
  });

  if (persisted.state.currentWalletName === walletName) {
    persisted.state.currentWalletName = '';
    persisted.state.currentChainName = '';
    changed = true;
  }

  return changed ? JSON.stringify(persisted) : serializedState;
};

export const suppressPersistedKeplrConnection = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
) => {
  const serializedState = storage.getItem(INTERCHAIN_WALLET_STORAGE_KEY);
  if (!serializedState) return;

  const disconnectedState = disconnectPersistedInterchainWallet(
    serializedState,
    KEPLR_WALLET_NAME,
  );
  if (disconnectedState !== serializedState) {
    storage.setItem(INTERCHAIN_WALLET_STORAGE_KEY, disconnectedState);
  }
};
