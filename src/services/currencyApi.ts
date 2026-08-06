import { baseApi } from "@/lib/baseApi";
import type {
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
    useUpdateBusinessCurrenciesMutation,
} = currencyApi;
