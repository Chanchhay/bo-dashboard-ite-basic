import { baseApi } from "@/lib/baseApi";
import type {
    DailyChannelRevenue,
    SalesProfit,
} from "@/lib/api/sales-report";

export const salesReportApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * Revenue, cost and profit per channel over a range.
         *
         * Both ends are optional; leaving them out asks for all time. Keyed on
         * the range so switching back to one already read answers from cache.
         */
        getSalesProfit: builder.query<
            SalesProfit,
            { from?: string; to?: string }
        >({
            query: ({ from, to }) => ({
                url: "/sales/profit",
                params: {
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                },
            }),
            providesTags: ["SalesProfit"],
        }),

        /**
         * Revenue per channel per day over a range.
         *
         * Days a channel sold nothing come back absent rather than zero; the
         * caller knows the range it asked for and fills its own gaps.
         */
        getDailyRevenue: builder.query<
            DailyChannelRevenue[],
            { from?: string; to?: string }
        >({
            query: ({ from, to }) => ({
                url: "/sales/revenue/daily",
                params: {
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                },
            }),
            providesTags: ["SalesDailyRevenue"],
        }),
    }),
});

export const { useGetSalesProfitQuery, useGetDailyRevenueQuery } =
    salesReportApi;
