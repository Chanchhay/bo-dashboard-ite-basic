import { baseApi } from "@/lib/baseApi";
import type {
    AddOrderItemInput,
    Khqr,
    ParkOrderInput,
    PaymentStatus,
    PayOrderInput,
    PosOrder,
    PosOrderPage,
    PosReceiptDetail,
    Sale,
    UpdateOrderItemInput,
} from "@/lib/api/pos-order";

/**
 * The cart, shared by the item grid and the order panel.
 *
 * Every mutation answers with the whole order, so each one writes the result
 * straight into the cache. The panel updates from the same response that added
 * the line — no refetch, and no window where the two disagree.
 */
export const posOrderApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCurrentOrder: builder.query<PosOrder | null, void>({
            query: () => "/orders/current",
            providesTags: ["PosOrder"],
        }),

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
            invalidatesTags: ["PosOrder", { type: "PosOpenOrders", id: "LIST" }],
        }),

        loadOrderForEdit: builder.mutation<PosOrder, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}/edit`,
                method: "POST",
            }),
            onQueryStarted: writeBackOrder,
        }),

        cancelOpenOrder: builder.mutation<PosOrder, string>({
            query: (orderId) => ({
                url: `/orders/${encodeURIComponent(orderId)}/cancel`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, orderId) => [
                "PosOrder",
                { type: "PosOpenOrders", id: orderId },
                { type: "PosOpenOrders", id: "LIST" },
            ],
        }),

        addOrderItem: builder.mutation<PosOrder, AddOrderItemInput>({
            query: (body) => ({
                url: "/orders/current/items",
                method: "POST",
                body,
            }),
            onQueryStarted: writeBackOrder,
        }),

        updateOrderItem: builder.mutation<
            PosOrder,
            { orderItemId: string } & UpdateOrderItemInput
        >({
            query: ({ orderItemId, ...body }) => ({
                url: `/order-items/${orderItemId}`,
                method: "PATCH",
                body,
            }),
            onQueryStarted: writeBackOrder,
        }),

        removeOrderItem: builder.mutation<PosOrder | null, string>({
            query: (orderItemId) => ({
                url: `/order-items/${orderItemId}`,
                method: "DELETE",
            }),
            onQueryStarted: writeBackOrder,
        }),

        renameOrder: builder.mutation<PosOrder, { note: string }>({
            query: (body) => ({
                url: "/orders/current/rename",
                method: "PATCH",
                body,
            }),
            onQueryStarted: writeBackOrder,
        }),

        clearOrder: builder.mutation<null, void>({
            query: () => ({ url: "/orders/current/clear", method: "POST" }),
            invalidatesTags: [
                "PosOrder",
                { type: "PosOpenOrders", id: "LIST" },
            ],
        }),

        /** Whether KHQR can be offered at all. */
        getBakongStatus: builder.query<
            { configured: boolean; active: boolean },
            void
        >({
            query: () => "/payment-settings/bakong",
        }),

        generateKhqr: builder.mutation<Khqr, void>({
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
            query: () => "/orders/current/payment-status",
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.sale) {
                        dispatch(
                            posOrderApi.util.invalidateTags([
                                { type: "PosReceipts", id: "LIST" },
                            ]),
                        );
                    }
                } catch {
                    // Polling errors are surfaced by the query itself.
                }
            },
        }),

        /** Settles the sale. The cart is gone afterwards, so the cache is dropped. */
        payOrder: builder.mutation<Sale, PayOrderInput>({
            query: (body) => ({
                url: "/orders/current/pay",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                "PosOrder",
                { type: "PosOpenOrders", id: "LIST" },
                { type: "PosReceipts", id: "LIST" },
            ],
        }),
    }),
});

/** Puts the order a mutation returned into the cache the cart reads from. */
async function writeBackOrder(
    _arg: unknown,
    {
        dispatch,
        queryFulfilled,
    }: {
        dispatch: (action: unknown) => unknown;
        queryFulfilled: Promise<{ data: PosOrder | null }>;
    },
) {
    try {
        const { data } = await queryFulfilled;

        dispatch(
            posOrderApi.util.updateQueryData(
                "getCurrentOrder",
                undefined,
                () => data,
            ),
        );
    } catch {
        // The mutation already surfaced the failure; the cache keeps the last
        // good order rather than being cleared out from under the cashier.
    }
}

export const {
    useGetCurrentOrderQuery,
    useGetOpenOrdersQuery,
    useGetReceiptsQuery,
    useGetReceiptQuery,
    useParkOrderMutation,
    useLoadOrderForEditMutation,
    useCancelOpenOrderMutation,
    useAddOrderItemMutation,
    useUpdateOrderItemMutation,
    useRemoveOrderItemMutation,
    useRenameOrderMutation,
    useClearOrderMutation,
    usePayOrderMutation,
    useGetBakongStatusQuery,
    useGenerateKhqrMutation,
    useGetPaymentStatusQuery,
} = posOrderApi;
