import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type SessionState = {
  cashierId: string | null;         // set once PIN is verified
  businessOwnerId: string | null;   // which business this cashier belongs to — required for every API call
  registerSessionId: string | null; // set once register is opened
};

const initialState: SessionState = {
  cashierId: null,
  businessOwnerId: null,
  registerSessionId: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    // Set together — a cashier is always tied to exactly one business,
    // so there's no valid state where one exists without the other.
    setCashier: (
      state,
      action: PayloadAction<{ cashierId: string; businessOwnerId: string }>
    ) => {
      state.cashierId = action.payload.cashierId;
      state.businessOwnerId = action.payload.businessOwnerId;
    },
    setRegisterSession: (state, action: PayloadAction<string>) => {
      state.registerSessionId = action.payload;
    },
    clearSession: () => initialState, // logout / close register
  },
});

export const { setCashier, setRegisterSession, clearSession } = sessionSlice.actions;
export default sessionSlice.reducer;