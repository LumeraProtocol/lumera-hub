import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

import walletSlice from '@/redux/wallet.slice';
import appSlice from '@/redux/app.slice';
import errorSlice from '@/redux/error.slice';
import adminSlice from '@/redux/admin.slice';

const rootReducer = combineReducers({
  wallet: walletSlice,
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
