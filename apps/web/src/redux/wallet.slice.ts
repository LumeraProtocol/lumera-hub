import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface IWalletState {
  address: string;
  isConnected: boolean;
  walletName: string;
  preferredWalletName: string;
  isModalOpen: boolean;
}

const initialState: IWalletState = {
  address: '',
  isConnected: false,
  isModalOpen: false,
  walletName: '',
  preferredWalletName: '',
};

type TAddressAction = {
  address: string;
};

type TConnectedAction = {
  status: boolean;
};

type TModalOpenAction = {
  status: boolean;
  preferredWalletName?: string;
};

type TWalletnameAction = {
  walletName: string;
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setAddress: (state, { payload }: PayloadAction<TAddressAction>) => {
      state.address = payload.address;
    },
    setConnected: (state, { payload }: PayloadAction<TConnectedAction>) => {
      state.isConnected = payload.status;
    },
    setWalletName: (state, { payload }: PayloadAction<TWalletnameAction>) => {
      state.walletName = payload.walletName;
    },
    setModalOpen: (state, { payload }: PayloadAction<TModalOpenAction>) => {
      state.isModalOpen = payload.status;
      state.preferredWalletName = payload.status ? payload.preferredWalletName || '' : '';
    },
  },
});

export const { setAddress, setConnected, setWalletName, setModalOpen } = walletSlice.actions;
export default walletSlice.reducer;
