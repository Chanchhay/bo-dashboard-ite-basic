import { baseApi } from "@/lib/baseApi";
import {
    fetchFrankfurterRates,
    type FrankfurterRateItem,
} from "@/lib/api/frankfurter";

export interface LiveRatesResponse {
    date: string;
    base: string;
    rates: Record<string, number>;
}

export const frankfurterApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getLiveExchangeRates: builder.query<LiveRatesResponse, string | void>({
            queryFn: async (baseCurrency) => {
                try {
                    const base = baseCurrency || "USD";
                    const data = await fetchFrankfurterRates(base);
                    return { data };
                } catch (error) {
                    return {
                        error: {
                            status: "CUSTOM_ERROR",
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Failed to fetch live exchange rates",
                        },
                    };
                }
            },
        }),
    }),
});

export const { useGetLiveExchangeRatesQuery, useLazyGetLiveExchangeRatesQuery } =
    frankfurterApi;
