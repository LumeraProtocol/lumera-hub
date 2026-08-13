export const METAMASK_WALLET_NAME = 'metamask';
export const KEPLR_WALLET_NAME = 'keplr-extension';

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
