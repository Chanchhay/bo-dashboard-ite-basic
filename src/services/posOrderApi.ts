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

/**
 * The cart, shared by the item grid and the order panel.
 *
 * Every mutation answers with the whole order, so each one writes the result
 * straight into the cache. The panel updates from the same response that added
 * the line — no refetch, and no window where the two disagree.
 */
/** "ALL" is the absence of a filter, so it is never sent. */
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

        /** Sale Management's order list — every status, one page at a time. */
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

        /**
         * The stat cards above that list. Kept apart from the page so paging
         * reads rows only — the totals stay cached on the filters alone.
         */
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
            // The caller puts the order it answers with onto the till; there
            // is no cache here for it to be written into any more.
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
                // A cancelled order puts its stock back on the shelf.
                "InventoryStock",
            ],
        }),

        /** Accepts a pending order and takes its stock off the shelf now, ahead of payment. */
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
                // Confirming reserves the stock, so the shelf figure moves now.
                "InventoryStock",
            ],
        }),

        /** Owner-only: approves a storefront Pay Later order, taking its stock off the shelf now. */
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
            // The cart is pushed before payment opens, so the order this
            // prices against is already the finished one.
            query: () => ({ url: "/orders/current/khqr", method: "POST" }),
        }),

        /**
         * Polled while the code is on screen. Answers with the sale attached
         * once Bakong has settled, so the receipt needs no further call.
         */
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
                    // Polling errors are surfaced by the query itself.
                }
            },
        }),

        /*
         * These two tell the server what the cart already says.
         *
         * The optimistic patches that used to live here — a guess written into
         * a cache, undone if the request failed — have nothing left to guess
         * at: the cart is written to the device first and the panel reads it
         * from there.
         */
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

        /** Settles the sale. */
        payOrder: builder.mutation<Sale, PayOrderInput>({
            // The till flushes its cart before calling this, so the order
            // being settled is the one the cashier can see.
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
                // The goods have left the shelf. Without this the grid keeps
                // the count it loaded this morning, and the next cart is free
                // to sell the same five all over again.
                "InventoryStock",
            ],
        }),
    }),
});

/** Puts the order a mutation returned into the cache the cart reads from. */
export const {
    useGetOpenOrdersQuery,
    useGetOrderHistoryQuery,
    useGetOrderSummaryQuery,
    useGetReceiptsQuery,
    useGetReceiptQuery,
    useParkOrderMutation,
    useLoadOrderForEditMutation,
    useCancelOpenOrderMutation,
    useConfirmOrderMutation,
    useApprovePayLaterOrderMutation,
    useSetOrderCustomerMutation,
    useSetOrderDiscountMutation,
    usePayOrderMutation,
    useGetBakongStatusQuery,
    useGenerateKhqrMutation,
    useGetPaymentStatusQuery,
} = posOrderApi;



