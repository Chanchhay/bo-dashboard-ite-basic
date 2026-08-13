import { baseApi } from "@/lib/baseApi";
import type { SalesProfit } from "@/lib/api/sales-report";

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
    }),
});

export const { useGetSalesProfitQuery } = salesReportApi;
