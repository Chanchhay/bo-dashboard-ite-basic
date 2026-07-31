import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { baseApi } from "@/lib/baseApi";
import inventoryUiReducer from "@/store/inventoryUiSlice";

import { orderApi } from '@/features/order/order-api'
import { cashRegisterApi } from '@/features/pin/cash-register-api'
import { pinAuthApi } from '@/features/pin/pin-api'
import { authApi } from '@/services/authApi'
import sessionReducer from "@/features/sessionSlice";
import { closeRegisterApi } from '@/features/pin/close-cash-register-api'
import { receiptApi } from '@/features/order/receipt-api'

export const makeStore = () => {
    const store = configureStore({
        reducer: {
            [baseApi.reducerPath]: baseApi.reducer,
            inventoryUi: inventoryUiReducer,
            [authApi.reducerPath]: authApi.reducer,
            [orderApi.reducerPath]: orderApi.reducer,
            [pinAuthApi.reducerPath]: pinAuthApi.reducer,
            [cashRegisterApi.reducerPath]: cashRegisterApi.reducer,
            session: sessionReducer,
            [closeRegisterApi.reducerPath]: closeRegisterApi.reducer,
            [receiptApi.reducerPath]: receiptApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(
                baseApi.middleware,
                authApi.middleware,
                orderApi.middleware,
                pinAuthApi.middleware,
                cashRegisterApi.middleware,
                closeRegisterApi.middleware,
                receiptApi.middleware
            ),
    });

    setupListeners(store.dispatch);

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
