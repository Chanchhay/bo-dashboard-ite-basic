import { baseApi } from "@/lib/baseApi";
import type {
    CollectPayLaterInput,
    PayLaterSale,
} from "@/lib/api/pay-later";
import type {
    DailyChannelRevenue,
    ItemProfitReport,
    PeriodProfitReport,
    PredictionWindow,
    ReportGranularity,
    SaleProfitCalculatorRequest,
    SaleProfitCalculatorResponse,
    SalesPredictionsResponse,
    SalesProfit,
} from "@/lib/api/sales-report";

export const salesReportApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
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

        getPeriodProfit: builder.query<
            PeriodProfitReport,
            { from?: string; to?: string; granularity: ReportGranularity }
        >({
            query: ({ from, to, granularity }) => ({
                url: "/sales/profit/periods",
                params: {
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                    granularity,
                },
            }),
            providesTags: ["SalesProfit"],
        }),

        getItemProfit: builder.query<
            ItemProfitReport,
            { from?: string; to?: string }
        >({
            query: ({ from, to }) => ({
                url: "/sales/profit/items",
                params: {
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                },
            }),
            providesTags: ["SalesProfit"],
        }),

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

        getSalesPredictions: builder.query<
            SalesPredictionsResponse,
            { window: PredictionWindow }
        >({
            query: ({ window }) => ({
                url: "/sales/predictions",
                params: { window },
            }),
            providesTags: ["SalesProfit"],
        }),

        calculateSaleProfit: builder.query<
            SaleProfitCalculatorResponse,
            SaleProfitCalculatorRequest
        >({
            query: (body) => ({
                url: "/sales/profit/calculator",
                method: "POST",
                body,
            }),
        }),

        getPayLaterSales: builder.query<PayLaterSale[], void>({
            query: () => "/sales/pay-later",
            providesTags: ["PayLaterSales"],
        }),

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
    useGetPayLaterSalesQuery,
    useCollectPayLaterPaymentMutation,
    useGetPeriodProfitQuery,
    useGetItemProfitQuery,
    useGetDailyRevenueByChannelQuery,
    useGetSalesPredictionsQuery,
    useCalculateSaleProfitQuery,
} = salesReportApi;
