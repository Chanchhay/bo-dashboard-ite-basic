import { baseApi } from "@/lib/baseApi";
import type {
    AddOrderItemInput,
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
    UpdateOrderItemInput,
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

let inFlightCount = 0;

function handleFulfilled(dispatch: any, data: PosOrder | null) {
    if (inFlightCount <= 0 && data) {
        dispatch(
            posOrderApi.util.updateQueryData(
                "getCurrentOrder",
                undefined,
                () => data,
            ),
        );
    }
}

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
                "PosOrderHistory",
                { type: "PosOpenOrders", id: orderId },
                { type: "PosOpenOrders", id: "LIST" },
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

        addOrderItem: builder.mutation<PosOrder, AddOrderItemInput>({
            query: ({ itemId, variantId, unitId, addOnIds, quantity }) => ({
                url: "/orders/current/items",
                method: "POST",
                body: { itemId, variantId, unitId, addOnIds, quantity },
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                inFlightCount++;
                const patchResult = dispatch(
                    posOrderApi.util.updateQueryData(
                        "getCurrentOrder",
                        undefined,
                        (draft) => {
                            if (!draft) return;
                            const addQty = arg.quantity || 1;
                            const existingIndex = draft.items.findIndex(
                                (item) =>
                                    item.itemId === arg.itemId &&
                                    (!arg.variantId ||
                                        item.variantId === arg.variantId) &&
                                    // A case and a can are different lines:
                                    // different prices, different stock.
                                    (item.unitId ?? undefined) ===
                                    arg.unitId &&
                                    // Different extras, different line.
                                    (item.addOns || [])
                                        .map((addOn) => addOn.addOnId)
                                        .sort()
                                        .join() ===
                                    [...(arg.addOnIds || [])]
                                        .sort()
                                        .join(),
                            );

                            if (existingIndex !== -1) {
                                const existing = draft.items[existingIndex];
                                existing.quantity += addQty;
                                existing.lineTotal =
                                    existing.quantity * existing.unitPrice -
                                    existing.discountAmount;
                            } else {
                                const unitPrice = arg.unitPrice ?? 0;
                                const lineTotal = addQty * unitPrice;
                                draft.items.push({
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    itemId: arg.itemId,
                                    variantId: arg.variantId ?? null,
                                    unitId: arg.unitId ?? null,
                                    itemName: arg.itemName ?? "Item",
                                    quantity: addQty,
                                    unitPrice,
                                    discountAmount: 0,
                                    lineTotal,
                                });
                            }

                            draft.subtotal = draft.items.reduce(
                                (sum, i) => sum + i.lineTotal + i.discountAmount,
                                0,
                            );
                            draft.total = Math.max(0, draft.subtotal - draft.discountAmount);
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0) {
                        patchResult.undo();
                    }
                }
            },
        }),

        updateOrderItem: builder.mutation<
            PosOrder,
            { orderItemId: string } & UpdateOrderItemInput
        >({
            query: ({ orderItemId, quantity }) => ({
                url: `/order-items/${orderItemId}`,
                method: "PATCH",
                body: { quantity },
            }),
            async onQueryStarted({ orderItemId, quantity }, { dispatch, queryFulfilled }) {
                inFlightCount++;
                const patchResult = dispatch(
                    posOrderApi.util.updateQueryData(
                        "getCurrentOrder",
                        undefined,
                        (draft) => {
                            if (!draft) return;
                            const item = draft.items.find((i) => i.id === orderItemId);
                            if (item) {
                                item.quantity = quantity;
                                item.lineTotal =
                                    item.quantity * item.unitPrice - item.discountAmount;
                                draft.subtotal = draft.items.reduce(
                                    (sum, i) => sum + i.lineTotal + i.discountAmount,
                                    0,
                                );
                                draft.total = Math.max(0, draft.subtotal - draft.discountAmount);
                            }
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0) {
                        patchResult.undo();
                    }
                }
            },
        }),

        removeOrderItem: builder.mutation<PosOrder | null, string>({
            query: (orderItemId) => ({
                url: `/order-items/${orderItemId}`,
                method: "DELETE",
            }),
            async onQueryStarted(orderItemId, { dispatch, queryFulfilled }) {
                inFlightCount++;
                const patchResult = dispatch(
                    posOrderApi.util.updateQueryData(
                        "getCurrentOrder",
                        undefined,
                        (draft) => {
                            if (!draft) return;
                            draft.items = draft.items.filter((i) => i.id !== orderItemId);
                            draft.subtotal = draft.items.reduce(
                                (sum, i) => sum + i.lineTotal + i.discountAmount,
                                0,
                            );
                            draft.total = Math.max(0, draft.subtotal - draft.discountAmount);
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0) {
                        patchResult.undo();
                    }
                }
            },
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
                "PosOrderHistory",
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

        setOrderCustomer: builder.mutation<PosOrder, SetOrderCustomerInput>({
            query: (body) => ({
                url: "/orders/current/customer",
                method: "PATCH",
                body,
            }),
            async onQueryStarted(body, { dispatch, queryFulfilled }) {
                inFlightCount++;
                const patchResult = dispatch(
                    posOrderApi.util.updateQueryData(
                        "getCurrentOrder",
                        undefined,
                        (draft) => {
                            if (!draft) return;
                            draft.customerId = body.customerId ?? null;
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0) {
                        patchResult.undo();
                    }
                }
            },
        }),

        setOrderDiscount: builder.mutation<PosOrder, SetOrderDiscountInput>({
            query: (body) => ({
                url: "/orders/current/discount",
                method: "PATCH",
                body,
            }),
            async onQueryStarted(body, { dispatch, queryFulfilled }) {
                inFlightCount++;
                const patchResult = dispatch(
                    posOrderApi.util.updateQueryData(
                        "getCurrentOrder",
                        undefined,
                        (draft) => {
                            if (!draft) return;
                            draft.discountAmount = body.discountAmount;
                            draft.total = Math.max(0, draft.subtotal - body.discountAmount);
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0) {
                        patchResult.undo();
                    }
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
                "PosOrderHistory",
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
    useGetOrderHistoryQuery,
    useGetOrderSummaryQuery,
    useGetReceiptsQuery,
    useGetReceiptQuery,
    useParkOrderMutation,
    useLoadOrderForEditMutation,
    useCancelOpenOrderMutation,
    useConfirmOrderMutation,
    useApprovePayLaterOrderMutation,
    useAddOrderItemMutation,
    useUpdateOrderItemMutation,
    useRemoveOrderItemMutation,
    useRenameOrderMutation,
    useClearOrderMutation,
    useSetOrderCustomerMutation,
    useSetOrderDiscountMutation,
    usePayOrderMutation,
    useGetBakongStatusQuery,
    useGenerateKhqrMutation,
    useGetPaymentStatusQuery,
} = posOrderApi;



