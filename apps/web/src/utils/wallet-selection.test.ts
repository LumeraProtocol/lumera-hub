import { describe, expect, it } from 'vitest';

import {
  getActiveWalletAddress,
  getActiveWalletMode,
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
