import { baseApi } from "@/lib/baseApi";
import type {
    BestSellingRow,
    DashboardOverview,
    DashboardPage,
    RecentOrderRow,
} from "@/lib/api/dashboard";
import type { ReportGranularity } from "@/lib/api/sales-report";

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDashboardOverview: builder.query<
            DashboardOverview,
            { from?: string; to?: string; granularity?: ReportGranularity }
        >({
            query: ({ from, to, granularity }) => ({
                url: "/dashboard/overview",
                params: {
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                    ...(granularity ? { granularity } : {}),
                },
            }),
            providesTags: ["SalesProfit"],
        }),

        getRecentOrders: builder.query<
            DashboardPage<RecentOrderRow>,
            { search?: string; page?: number; size?: number }
        >({
            query: ({ search, page, size }) => ({
                url: "/dashboard/recent-orders",
                params: {
                    ...(search ? { search } : {}),
                    page: page ?? 0,
                    size: size ?? 5,
                },
            }),
            providesTags: ["SalesProfit"],
        }),

        getBestSelling: builder.query<
            DashboardPage<BestSellingRow>,
            { from?: string; to?: string; search?: string; page?: number; size?: number }
        >({
            query: ({ from, to, search, page, size }) => ({
                url: "/dashboard/best-selling",
                params: {
                    ...(from ? { from } : {}),
                    ...(to ? { to } : {}),
                    ...(search ? { search } : {}),
                    page: page ?? 0,
                    size: size ?? 5,
                },
            }),
            providesTags: ["SalesProfit"],
        }),
    }),
});

export const {
    useGetDashboardOverviewQuery,
    useGetRecentOrdersQuery,
    useGetBestSellingQuery,
    useLazyGetRecentOrdersQuery,
    useLazyGetBestSellingQuery,
} = dashboardApi;
