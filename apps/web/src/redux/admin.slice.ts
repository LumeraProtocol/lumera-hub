import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';

interface IAdminState {
  startDate: string | null;
  endDate: string | null;
}

const initialState: IAdminState = {
  startDate: `${new Date(dayjs().subtract(30, 'day').valueOf())}`,
  endDate: `${new Date()}`,
};

type TDateAction = {
  startDate: string | null;
  endDate: string | null;
};

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setDate: (state, { payload }: PayloadAction<TDateAction>) => {
      state.startDate = payload.startDate;
      state.endDate = payload.endDate;
    },
  },
});

export const { setDate } = adminSlice.actions;
export default adminSlice.reducer;
