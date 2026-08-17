import { describe, expect, it } from 'vitest';

import walletReducer, { setModalOpen } from './wallet.slice';
import { KEPLR_WALLET_NAME } from '@/utils/wallet-selection';

describe('wallet modal selection', () => {
  it('stores a requested wallet while opening and clears it when closing', () => {
    const opened = walletReducer(undefined, setModalOpen({
      status: true,
      preferredWalletName: KEPLR_WALLET_NAME,
    }));

    expect(opened.isModalOpen).toBe(true);
    expect(opened.preferredWalletName).toBe(KEPLR_WALLET_NAME);

    const closed = walletReducer(opened, setModalOpen({ status: false }));
    expect(closed.isModalOpen).toBe(false);
    expect(closed.preferredWalletName).toBe('');
  });
});
