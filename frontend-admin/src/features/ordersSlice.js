import { createSlice } from '@reduxjs/toolkit';

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { items: [] },
  reducers: {
    setOrders: (state, action) => { state.items = action.payload; },
    addOrUpdateOrder: (state, action) => {
      const idx = state.items.findIndex((o) => o._id === action.payload._id);
      if (idx >= 0) state.items[idx] = action.payload;
      else state.items.unshift(action.payload);
    },
  },
});

export const { setOrders, addOrUpdateOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
