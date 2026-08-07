import { baseApi } from "@/lib/baseApi";
import type {
    BusinessCurrency,
    BusinessCurrencyConfiguration,
    BusinessCurrencyConfigurationInput,
} from "@/lib/api/currency";

export const currencyApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getBusinessCurrencies: builder.query<
            BusinessCurrencyConfiguration,
            void
        >({
            query: () => "/business-currencies",
            providesTags: ["BusinessCurrencies"],
        }),
        getBusinessCurrencyByCode: builder.query<BusinessCurrency, string>({
            query: (code) => `/business-currencies/${encodeURIComponent(code)}`,
            providesTags: (_result, _error, code) => [
                { type: "BusinessCurrencies", id: code },
            ],
        }),
        updateBusinessCurrencies: builder.mutation<
            BusinessCurrencyConfiguration,
            BusinessCurrencyConfigurationInput
        >({
            query: (body) => ({
                url: "/business-currencies",
                method: "PUT",
                body,
            }),
            // Changing the base currency restates every stored price, so the
            // cached catalogue and pricing rules are stale the moment this
            // returns — not just the currency configuration itself.
            invalidatesTags: [
                "Business",
                "BusinessCurrencies",
                "InventoryItems",
                "ItemChannels",
                "Discounts",
                "Coupons",
                "MembershipTypes",
                "PosOrder",
                "Storefront",
            ],
        }),
    }),
});

export const {
    useGetBusinessCurrenciesQuery,
    useGetBusinessCurrencyByCodeQuery,
    useLazyGetBusinessCurrencyByCodeQuery,
    useUpdateBusinessCurrenciesMutation,
} = currencyApi;

