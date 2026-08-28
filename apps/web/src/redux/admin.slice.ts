import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';

interface IAdminState {
  startDate: string | null;
  endDate: string | null;
  isLogged: boolean;
}

const initialState: IAdminState = {
  startDate: `${new Date(dayjs().subtract(30, 'day').valueOf())}`,
  endDate: `${new Date()}`,
  isLogged: false,
};

type TDateAction = {
  startDate: string | null;
  endDate: string | null;
};

type TLoginStatusAction = {
  isLogged: boolean;
};

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setDate: (state, { payload }: PayloadAction<TDateAction>) => {
      state.startDate = payload.startDate;
      state.endDate = payload.endDate;
    },
    setLoginStatus: (state, { payload }: PayloadAction<TLoginStatusAction>) => {
      state.isLogged = payload.isLogged;
    },
  },
});

export const { setDate, setLoginStatus } = adminSlice.actions;
export default adminSlice.reducer;
