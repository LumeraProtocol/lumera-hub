import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { ViewId } from '@/types';

interface IAppState {
  activeView: ViewId;
  currentPath: string;
  viewTitle: string;
}

const initialState: IAppState = {
  activeView: 'dashboard',
  currentPath: '/',
  viewTitle: '',
};

type TActiveViewAction = {
  activeView: ViewId;
};

type TCurrentPathAction = {
  currentPath: string;
};

type TViewTitleAction = {
  viewTitle: string;
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setActiveView: (state, { payload }: PayloadAction<TActiveViewAction>) => {
      state.activeView = payload.activeView;
    },
    setCurrentPath: (state, { payload }: PayloadAction<TCurrentPathAction>) => {
      state.currentPath = payload.currentPath;
    },
    setViewTitle: (state, { payload }: PayloadAction<TViewTitleAction>) => {
      state.viewTitle = payload.viewTitle;
    },
  },
});

export const { setCurrentPath, setActiveView, setViewTitle } = appSlice.actions;
export default appSlice.reducer;