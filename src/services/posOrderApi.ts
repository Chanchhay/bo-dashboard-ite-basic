import { baseApi } from "@/lib/baseApi";
import type {
    Khqr,
    OrderHistoryQuery,
    OrderPageQuery,
    OrderSummary,
    ParkOrderInput,
    PaymentStatus,
    PayOrderInput,
    PosOrder,
    PosOrderPage,
    PosReceiptDetail,
    Sale,
    SetOrderCustomerInput,
    SetOrderDiscountInput,
} from "@/lib/api/pos-order";

function orderFilterParams(input: OrderHistoryQuery | void | null) {
    return {
        status:
            input?.status && input.status !== "ALL" ? input.status : undefined,
        channel:
            input?.channel && input.channel !== "ALL"
                ? input.channel
                : undefined,
        from: input?.from,
        to: input?.to,
    };
}

export const posOrderApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOpenOrders: builder.query<PosOrderPage, void>({
            query: () => "/orders/open",
            providesTags: (result) => [
                { type: "PosOpenOrders", id: "LIST" },
                ...(result?.content.map((order) => ({
                    type: "PosOpenOrders" as const,
                    id: order.id,
                })) ?? []),
            ],
        }),

        getOrderHistory: builder.query<PosOrderPage, OrderPageQuery | void>({
            query: (input) => ({
                url: "/orders",
                params: {
                    ...orderFilterParams(input),
                    page: input?.page ?? 0,
                    size: input?.size ?? 25,
                },
            }),
            providesTags: ["PosOrderHistory"],
        }),

        getOrderSummary: builder.query<OrderSummary, OrderHistoryQuery | void>({
            query: (input) => ({
                url: "/orders/summary",
                params: orderFilterParams(input),
            }),
            providesTags: ["PosOrderHistory"],
        }),

        getReceipts: builder.query<
            PosOrderPage,
            { page?: number; size?: number; from?: string; to?: string } | void
        >({
            query: (input) => ({
                url: "/orders/receipts",
                params: {
                    page: input?.page ?? 0,
                    size: input?.size ?? 10,
                    from: input?.from,
                    to: input?.to,
                },
            }),
            providesTags: (result) => [
                { type: "PosReceipts", id: "LIST" },
                ...(result?.content.map((order) => ({
                    type: "PosReceipts" as const,
                    id: order.id,
                })) ?? []),
            ],
        }),

        getReceipt: builder.query<PosReceiptDetail, string>({
            query: (orderId) =>
                `/orders/${encodeURIComponent(orderId)}/receipt`,
            providesTags: (_result, _error, orderId) => [
                { type: "PosReceipts", id: orderId },
            ],
        }),

        parkOrder: builder.mutation<PosOrder, ParkOrderInput>({
            query: (body) => ({
                url: "/orders/current/park",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                "PosOrder",
                "PosOrderHistory",
                { type: "PosOpenOrders", id: "LIST" },
            ],
        }),

        loadOrderForEdit: builder.mutation<PosOrder, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}/edit`,
                method: "POST",
            }),
        }),

        cancelOpenOrder: builder.mutation<PosOrder, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}/cancel`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, orderId) => [
                "PosOrder",
                "PosOrderHistory",
                { type: "PosOpenOrders", id: orderId },
                { type: "PosOpenOrders", id: "LIST" },
                "InventoryStock",
            ],
        }),

        deleteOrder: builder.mutation<void, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, orderId) => [
                "PosOrder",
                "PosOrderHistory",
                { type: "PosOpenOrders", id: orderId },
                { type: "PosOpenOrders", id: "LIST" },
                "InventoryStock",
            ],
        }),

        confirmOrder: builder.mutation<PosOrder, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}/confirm`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, orderId) => [
                "PosOrder",
                "PosOrderHistory",
                { type: "PosOpenOrders", id: orderId },
                { type: "PosOpenOrders", id: "LIST" },
                "InventoryStock",
            ],
        }),

        approvePayLaterOrder: builder.mutation<PosOrder, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}/pay-later/approve`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, orderId) => [
                "PosOrder",
                "PosOrderHistory",
                { type: "PosOpenOrders", id: orderId },
                { type: "PosOpenOrders", id: "LIST" },
            ],
        }),

        getBakongStatus: builder.query<
            { configured: boolean; active: boolean },
            void
        >({
            query: () => "/payment-settings/bakong",
        }),

        generateKhqr: builder.mutation<Khqr, void>({
            query: () => ({ url: "/orders/current/khqr", method: "POST" }),
        }),

        getPaymentStatus: builder.query<
            { status: PaymentStatus | null; sale: Sale | null },
            void
        >({
            query: () => ({
                url: "/orders/current/payment-status",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                },
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.sale) {
                        dispatch(
                            posOrderApi.util.invalidateTags([
                                "PosOrderHistory",
                                { type: "PosReceipts", id: "LIST" },
                            ]),
                        );
                    }
                } catch {
                }
            },
        }),

        setOrderCustomer: builder.mutation<PosOrder, SetOrderCustomerInput>({
            query: (body) => ({
                url: "/orders/current/customer",
                method: "PATCH",
                body,
            }),
        }),

        setOrderDiscount: builder.mutation<PosOrder, SetOrderDiscountInput>({
            query: (body) => ({
                url: "/orders/current/discount",
                method: "PATCH",
                body,
            }),
        }),

        payOrder: builder.mutation<Sale, PayOrderInput>({
            query: (body) => ({
                url: "/orders/current/pay",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                "PosOrder",
                "PosOrderHistory",
                { type: "PosOpenOrders", id: "LIST" },
                { type: "PosReceipts", id: "LIST" },
                "InventoryStock",
            ],
        }),
    }),
});

export const {
    useGetOpenOrdersQuery,
    useGetOrderHistoryQuery,
    useGetOrderSummaryQuery,
    useGetReceiptsQuery,
    useGetReceiptQuery,
    useParkOrderMutation,
    useLoadOrderForEditMutation,
    useCancelOpenOrderMutation,
    useDeleteOrderMutation,
    useConfirmOrderMutation,
    useApprovePayLaterOrderMutation,
    useSetOrderCustomerMutation,
    useSetOrderDiscountMutation,
    usePayOrderMutation,
    useGetBakongStatusQuery,
    useGenerateKhqrMutation,
    useGetPaymentStatusQuery,
} = posOrderApi;

