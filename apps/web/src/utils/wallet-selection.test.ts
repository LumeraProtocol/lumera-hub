import { describe, expect, it } from 'vitest';

import {
  getActiveWalletAddress,
  getActiveWalletMode,
  getAlternativeWalletName,
  getPreferredWalletSelection,
  disconnectPersistedInterchainWallet,
  KEPLR_WALLET_NAME,
  METAMASK_WALLET_NAME,
} from './wallet-selection';

describe('active wallet selection', () => {
  it('requires an explicit selection on EVM-enabled network profiles', () => {
    const mode = getActiveWalletMode({ selectedWallet: '', isEvmNetwork: true });
    expect(mode).toBe('none');
    expect(getActiveWalletAddress({
      mode,
      evmAddress: '0xabc',
      cosmosAddress: 'lumera1abc',
    })).toBe('');
  });

  it('uses the MetaMask EVM address when MetaMask is selected', () => {
    const mode = getActiveWalletMode({
      selectedWallet: METAMASK_WALLET_NAME,
      isEvmNetwork: true,
    });
    expect(mode).toBe('evm');
    expect(getActiveWalletAddress({ mode, evmAddress: '0xabc', cosmosAddress: 'lumera1abc' }))
      .toBe('0xabc');
  });

  it('uses the Keplr Cosmos address when Keplr is selected', () => {
    const mode = getActiveWalletMode({
      selectedWallet: KEPLR_WALLET_NAME,
      isEvmNetwork: true,
    });
    expect(mode).toBe('cosmos');
    expect(getActiveWalletAddress({ mode, evmAddress: '0xabc', cosmosAddress: 'lumera1abc' }))
      .toBe('lumera1abc');
  });

  it('keeps legacy Cosmos wallet behavior on non-EVM profiles', () => {
    const mode = getActiveWalletMode({
      selectedWallet: METAMASK_WALLET_NAME,
      isEvmNetwork: false,
    });
    expect(mode).toBe('cosmos');
    expect(getActiveWalletAddress({ mode, evmAddress: '0xabc', cosmosAddress: 'lumera1abc' }))
      .toBe('lumera1abc');
  });
});

describe('preferred wallet selection', () => {
  it('keeps the active installed wallet selected when reopening the dialog', () => {
    expect(getPreferredWalletSelection({
      currentSelection: METAMASK_WALLET_NAME,
      isKeplrInstalled: true,
      isMetaMaskInstalled: true,
    })).toBe(METAMASK_WALLET_NAME);
  });

  it('defaults to Keplr when both wallets are installed', () => {
    expect(getPreferredWalletSelection({
      currentSelection: '',
      isKeplrInstalled: true,
      isMetaMaskInstalled: true,
    })).toBe(KEPLR_WALLET_NAME);
  });

  it('selects the only installed wallet and leaves none selected otherwise', () => {
    expect(getPreferredWalletSelection({
      currentSelection: '',
      isKeplrInstalled: false,
      isMetaMaskInstalled: true,
    })).toBe(METAMASK_WALLET_NAME);
    expect(getPreferredWalletSelection({
      currentSelection: '',
      isKeplrInstalled: false,
      isMetaMaskInstalled: false,
    })).toBe('');
  });
});

describe('alternative wallet selection', () => {
  it('offers MetaMask to a Keplr user only when MetaMask is installed', () => {
    expect(getAlternativeWalletName({
      currentWallet: KEPLR_WALLET_NAME,
      isKeplrInstalled: true,
      isMetaMaskInstalled: true,
    })).toBe(METAMASK_WALLET_NAME);
    expect(getAlternativeWalletName({
      currentWallet: KEPLR_WALLET_NAME,
      isKeplrInstalled: true,
      isMetaMaskInstalled: false,
    })).toBe('');
  });

  it('offers Keplr to a MetaMask user only when Keplr is installed', () => {
    expect(getAlternativeWalletName({
      currentWallet: METAMASK_WALLET_NAME,
      isKeplrInstalled: true,
      isMetaMaskInstalled: true,
    })).toBe(KEPLR_WALLET_NAME);
    expect(getAlternativeWalletName({
      currentWallet: METAMASK_WALLET_NAME,
      isKeplrInstalled: false,
      isMetaMaskInstalled: true,
    })).toBe('');
  });
});

describe('persisted Cosmos wallet isolation', () => {
  it('disconnects a restored Keplr session when MetaMask is the active wallet', () => {
    const persisted = JSON.stringify({
      state: {
        chainWalletState: [
          {
            chainName: 'lumera-testnet',
            walletName: KEPLR_WALLET_NAME,
            walletState: 'Connected',
            account: { address: 'lumera1abc' },
          },
          {
            chainName: 'lumera-testnet',
            walletName: 'other-extension',
            walletState: 'Connected',
            account: { address: 'lumera1def' },
          },
        ],
        currentWalletName: KEPLR_WALLET_NAME,
        currentChainName: 'lumera-testnet',
      },
      version: 0,
    });

    expect(JSON.parse(disconnectPersistedInterchainWallet(
      persisted,
      KEPLR_WALLET_NAME,
    ))).toEqual({
      state: {
        chainWalletState: [
          {
            chainName: 'lumera-testnet',
            walletName: KEPLR_WALLET_NAME,
            walletState: 'Disconnected',
            account: null,
          },
          {
            chainName: 'lumera-testnet',
            walletName: 'other-extension',
            walletState: 'Connected',
            account: { address: 'lumera1def' },
          },
        ],
        currentWalletName: '',
        currentChainName: '',
      },
      version: 0,
    });
  });

  it('leaves malformed and already-disconnected state untouched', () => {
    expect(disconnectPersistedInterchainWallet('{invalid', KEPLR_WALLET_NAME))
      .toBe('{invalid');

    const disconnected = JSON.stringify({
      state: {
        chainWalletState: [{
          walletName: KEPLR_WALLET_NAME,
          walletState: 'Disconnected',
          account: null,
        }],
        currentWalletName: '',
      },
    });
    expect(disconnectPersistedInterchainWallet(disconnected, KEPLR_WALLET_NAME))
      .toBe(disconnected);
  });
});
