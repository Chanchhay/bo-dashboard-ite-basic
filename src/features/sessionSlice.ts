import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type SessionState = {
  cashierId: string | null;
  businessOwnerId: string | null;
  registerSessionId: string | null;
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
    clearSession: () => initialState,
  },
});

export const { setCashier, setRegisterSession, clearSession } = sessionSlice.actions;
export default sessionSlice.reducer;
