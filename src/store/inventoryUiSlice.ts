import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type InventoryUiState = {
    productSearch: string;
    productStatus: "ALL" | "ACTIVE" | "INACTIVE";
    stockSearch: string;
};

const initialState: InventoryUiState = {
    productSearch: "",
    productStatus: "ALL",
    stockSearch: "",
};

const inventoryUiSlice = createSlice({
    name: "inventoryUi",
    initialState,
    reducers: {
        setProductSearch(state, action: PayloadAction<string>) {
            state.productSearch = action.payload;
        },
        setProductStatus(
            state,
            action: PayloadAction<InventoryUiState["productStatus"]>,
        ) {
            state.productStatus = action.payload;
        },
        setStockSearch(state, action: PayloadAction<string>) {
            state.stockSearch = action.payload;
        },
    },
});

export const {
    setProductSearch,
    setProductStatus,
    setStockSearch,
} = inventoryUiSlice.actions;

export default inventoryUiSlice.reducer;
