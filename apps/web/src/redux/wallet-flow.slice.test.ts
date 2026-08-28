import { describe, expect, it } from 'vitest';

import walletFlowReducer, { setWalletConnecting } from './wallet-flow.slice';
import { KEPLR_WALLET_NAME } from '@/utils/wallet-selection';

describe('wallet flow slice', () => {
  it('tracks the wallet a connect attempt is in flight for', () => {
    const connecting = walletFlowReducer(
      undefined,
      setWalletConnecting({ walletName: KEPLR_WALLET_NAME }),
    );
    expect(connecting.connectingWalletName).toBe(KEPLR_WALLET_NAME);

    const settled = walletFlowReducer(
      connecting,
      setWalletConnecting({ walletName: '' }),
    );
    expect(settled.connectingWalletName).toBe('');
  });

  it('starts with no connect attempt in flight', () => {
    expect(walletFlowReducer(undefined, { type: 'noop' }).connectingWalletName).toBe('');
  });
});
