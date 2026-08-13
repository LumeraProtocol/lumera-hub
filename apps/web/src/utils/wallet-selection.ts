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
