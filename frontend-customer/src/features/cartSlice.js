import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem: (state, action) => {
      const existing = state.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1, specialInstructions: '' });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.menuItemId !== action.payload);
    },
    updateQuantity: (state, action) => {
      const item = state.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (item) item.quantity = Math.max(1, action.payload.quantity);
    },
    updateInstructions: (state, action) => {
      const item = state.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (item) item.specialInstructions = action.payload.specialInstructions;
    },
    clearCart: (state) => { state.items = []; },
  },
});

export const { addItem, removeItem, updateQuantity, updateInstructions, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
