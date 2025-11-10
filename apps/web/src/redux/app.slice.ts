import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { ViewId } from '@/types';

interface IAppState {
  activeView: ViewId;
  currentPath: string;
  viewTitle: string;
  currentTab: string;
  validatorTab: string;
  subTab: string;
}

const initialState: IAppState = {
  activeView: 'dashboard',
  currentPath: '/',
  viewTitle: '',
  currentTab: 'active',
  validatorTab: 'all',
  subTab: 'delegations',
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

type TCurrentTabAction = {
  currentTab: string;
};

type TValidatorTabAction = {
  validatorTab: string;
};

type TSubTabAction = {
  subTab: string;
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
    setCurrentTab: (state, { payload }: PayloadAction<TCurrentTabAction>) => {
      state.currentTab = payload.currentTab;
    },
    setValidatorTab: (state, { payload }: PayloadAction<TValidatorTabAction>) => {
      state.validatorTab = payload.validatorTab;
    },
    setSubTab: (state, { payload }: PayloadAction<TSubTabAction>) => {
      state.subTab = payload.subTab;
    },
  },
});

export const {
  setCurrentPath,
  setActiveView,
  setViewTitle,
  setCurrentTab,
  setValidatorTab,
  setSubTab,
} = appSlice.actions;
export default appSlice.reducer;
