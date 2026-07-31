import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { InventoryItemSort } from "@/lib/api/inventory";

export type ProductAdvancedFilters = {
    itemGroupId: string;
    unitId: string;
    itemType: string;
    minPrice: string;
    maxPrice: string;
    sku: string;
    barcode: string;
};

export type ProductAdvancedFilterKey = keyof ProductAdvancedFilters;

const emptyProductAdvancedFilters: ProductAdvancedFilters = {
    itemGroupId: "",
    unitId: "",
    itemType: "ALL",
    minPrice: "",
    maxPrice: "",
    sku: "",
    barcode: "",
};

type InventoryUiState = {
    productSearch: string;
    productStatus: "ALL" | "ACTIVE" | "INACTIVE";
    productDraftFilters: ProductAdvancedFilters;
    productFilters: ProductAdvancedFilters;
    productSort: InventoryItemSort;
    productPage: number;
    productPageSize: number;
    stockSearch: string;
};

const initialState: InventoryUiState = {
    productSearch: "",
    productStatus: "ALL",
    productDraftFilters: { ...emptyProductAdvancedFilters },
    productFilters: { ...emptyProductAdvancedFilters },
    productSort: "name,asc",
    productPage: 0,
    productPageSize: 20,
    stockSearch: "",
};

const inventoryUiSlice = createSlice({
    name: "inventoryUi",
    initialState,
    reducers: {
        setProductSearch(state, action: PayloadAction<string>) {
            state.productSearch = action.payload;
            state.productPage = 0;
        },
        setProductStatus(
            state,
            action: PayloadAction<InventoryUiState["productStatus"]>,
        ) {
            state.productStatus = action.payload;
            state.productPage = 0;
        },
        setProductDraftFilter(
            state,
            action: PayloadAction<{
                key: ProductAdvancedFilterKey;
                value: string;
            }>,
        ) {
            const { key, value } = action.payload;
            state.productDraftFilters[key] = value;
        },
        applyProductFilters(state) {
            state.productFilters = { ...state.productDraftFilters };
            state.productPage = 0;
        },
        resetProductDraftFilters(state) {
            state.productDraftFilters = { ...emptyProductAdvancedFilters };
        },
        clearProductFilter(
            state,
            action: PayloadAction<ProductAdvancedFilterKey>,
        ) {
            const key = action.payload;
            const value = emptyProductAdvancedFilters[key];
            state.productFilters[key] = value;
            state.productDraftFilters[key] = value;
            state.productPage = 0;
        },
        clearAllProductFilters(state) {
            state.productSearch = "";
            state.productStatus = "ALL";
            state.productDraftFilters = { ...emptyProductAdvancedFilters };
            state.productFilters = { ...emptyProductAdvancedFilters };
            state.productPage = 0;
        },
        setProductSort(
            state,
            action: PayloadAction<InventoryItemSort>,
        ) {
            state.productSort = action.payload;
            state.productPage = 0;
        },
        setProductPage(state, action: PayloadAction<number>) {
            state.productPage = Math.max(action.payload, 0);
        },
        setProductPageSize(state, action: PayloadAction<number>) {
            state.productPageSize = action.payload;
            state.productPage = 0;
        },
        setStockSearch(state, action: PayloadAction<string>) {
            state.stockSearch = action.payload;
        },
    },
});

export const {
    applyProductFilters,
    clearAllProductFilters,
    clearProductFilter,
    resetProductDraftFilters,
    setProductDraftFilter,
    setProductPage,
    setProductPageSize,
    setProductSearch,
    setProductSort,
    setProductStatus,
    setStockSearch,
} = inventoryUiSlice.actions;

export default inventoryUiSlice.reducer;
