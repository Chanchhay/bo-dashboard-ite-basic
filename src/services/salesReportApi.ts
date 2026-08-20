import { baseApi } from "@/lib/baseApi";
import type {
    CollectPayLaterInput,
    PayLaterSale,
} from "@/lib/api/pay-later";
import type { DailyChannelRevenue, SalesProfit } from "@/lib/api/sales-report";

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
         * Revenue per channel, per day, over a range.
         *
         * What the dashboard's trend graph draws from — one row per day a
         * channel had at least one sale, so a quiet day is a gap rather than a
         * zero the caller has to know to insert.
         */
        getDailyRevenueByChannel: builder.query<
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
            providesTags: ["SalesProfit"],
        }),

        /** Every sale rung up as "Pay later" that hasn't been collected yet. */
        getPayLaterSales: builder.query<PayLaterSale[], void>({
            query: () => "/sales/pay-later",
            providesTags: ["PayLaterSales"],
        }),

        /** Settles a pay-later sale once the money actually comes in. */
        collectPayLaterPayment: builder.mutation<
            PayLaterSale,
            { saleId: string; body: CollectPayLaterInput }
        >({
            query: ({ saleId, body }) => ({
                url: `/sales/pay-later/${saleId}/collect`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["PayLaterSales", "SalesProfit"],
        }),
    }),
});

export const {
    useGetSalesProfitQuery,
    useGetDailyRevenueByChannelQuery,
    useGetPayLaterSalesQuery,
    useCollectPayLaterPaymentMutation,
} = salesReportApi;
