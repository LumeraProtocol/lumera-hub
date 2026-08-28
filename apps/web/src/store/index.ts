import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';
import { combineReducers } from 'redux';

import walletSlice from '@/redux/wallet.slice';
import walletFlowSlice from '@/redux/wallet-flow.slice';
import appSlice from '@/redux/app.slice';
import errorSlice from '@/redux/error.slice';
import adminSlice from '@/redux/admin.slice';

const createNoopStorage = () => ({
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
});

// Client components are still evaluated while Next renders on the server.
// Avoid asking redux-persist to probe localStorage there: its fallback works,
// but logs a misleading warning on every server/test startup.
const storage = typeof window === 'undefined'
  ? createNoopStorage()
  : createWebStorage('local');

const rootReducer = combineReducers({
  wallet: walletSlice,
  // Deliberately NOT whitelisted below: walletFlow marks in-flight connect
  // attempts, and rehydrating an "in flight" flag after a reload would let it
  // suppress the Keplr/MetaMask mode synchronizer forever.
  walletFlow: walletFlowSlice,
  app: appSlice,
  error: errorSlice,
  admin: adminSlice,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['wallet', 'app', 'error', 'admin'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/FLUSH',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
});

// Infer the `RootState` và `AppDispatch` types từ store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export persistor để dùng trong PersistGate
export const persistor = persistStore(store);

export default store;
