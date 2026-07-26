import { orderApi } from '@/features/order/order-api'
import { cashRegisterApi } from '@/features/pin/cash-register-api'
import { pinAuthApi } from '@/features/pin/pin-api'
import { authApi } from '@/service/authApi'
import {configureStore} from '@reduxjs/toolkit'
import sessionReducer from "@/features/sessionSlice";

// set up the store
export const makeStore = () => {
  return configureStore({
    reducer: {
      
      [authApi.reducerPath]: authApi.reducer,
      [orderApi.reducerPath] : orderApi.reducer,
      [pinAuthApi.reducerPath] : pinAuthApi.reducer,
      [cashRegisterApi.reducerPath] : cashRegisterApi.reducer,
      session: sessionReducer, 
    },
    middleware: (getDefaultMiddleware) => 
      getDefaultMiddleware().concat(authApi.middleware,orderApi.middleware, pinAuthApi.middleware,
        cashRegisterApi.middleware
      )
    
  }) 
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']