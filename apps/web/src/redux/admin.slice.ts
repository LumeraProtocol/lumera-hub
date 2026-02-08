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

type TStartDateAction = {
  startDate: string | null;
};

type TEndDateAction = {
  endDate: string | null;
};

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setStartDate: (state, { payload }: PayloadAction<TStartDateAction>) => {
      state.startDate = payload.startDate;
    },
    setEndDate: (state, { payload }: PayloadAction<TEndDateAction>) => {
      state.endDate = payload.endDate;
    },
  },
});

export const { setStartDate, setEndDate } = adminSlice.actions;
export default adminSlice.reducer;
