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
        /**
         * Every card on the dashboard, finished.
         *
         * Keyed on the range and granularity together, so switching back to a
         * view already read answers from cache rather than the database.
         */
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

        /**
         * The recent orders table, one page at a time.
         *
         * The search goes to the server because it must reach rows this page
         * does not hold.
         */
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

        /** The catalogue ranked by sales, one page at a time. */
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
    // Export downloads every matching row rather than the page on screen, and
    // only when asked — a lazy read is how it fetches the rest on the click.
    useLazyGetRecentOrdersQuery,
    useLazyGetBestSellingQuery,
} = dashboardApi;
