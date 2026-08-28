import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Transient wallet-connection state. Deliberately kept out of the redux-persist
 * whitelist: `connectingWalletName` marks a connect attempt that is in flight
 * RIGHT NOW, and the InterchainWalletModeSynchronizer suspends its Keplr
 * teardown while it points at Keplr. Persisting it (like the modal state in
 * the `wallet` slice) would let a reload latch the suspension forever.
 */
interface IWalletFlowState {
  connectingWalletName: string;
}

const initialState: IWalletFlowState = {
  connectingWalletName: '',
};

type TConnectingAction = {
  walletName: string;
};

export const walletFlowSlice = createSlice({
  name: 'walletFlow',
  initialState,
  reducers: {
    setWalletConnecting: (state, { payload }: PayloadAction<TConnectingAction>) => {
      state.connectingWalletName = payload.walletName;
    },
  },
});

export const { setWalletConnecting } = walletFlowSlice.actions;
export default walletFlowSlice.reducer;
