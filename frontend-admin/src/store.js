import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import ordersReducer from './features/ordersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: ordersReducer,
  },
});
