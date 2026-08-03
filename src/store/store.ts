import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { baseApi } from "@/lib/baseApi";
import inventoryUiReducer from "@/store/inventoryUiSlice";
import { notificationApi } from "@/services/notificationApi";

export const makeStore = () => {
    const store = configureStore({
        reducer: {
            [baseApi.reducerPath]: baseApi.reducer,
            [notificationApi.reducerPath]: notificationApi.reducer,
            inventoryUi: inventoryUiReducer,
            
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(
                baseApi.middleware,
                notificationApi.middleware,
            ),
    });

    setupListeners(store.dispatch);

    return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
