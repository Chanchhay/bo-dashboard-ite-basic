import type {
    FetchArgs,
    FetchBaseQueryError,
    QueryReturnValue,
} from "@reduxjs/toolkit/query/react";

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

/**
 * Cart writes go to the server one at a time.
 *
 * The first item rung up is also what opens the order, and the server knows
 * which cart it is only by a cookie set on that first response. Two taps in
 * flight at once both arrive without that cookie, so both open an order — the
 * losing one's lines then hang off a cart the till has already forgotten, and
 * every edit afterwards answers "There is no open order". Queueing costs
 * nothing on screen: the optimistic updates below still land on the first
 * frame, only the requests behind them are ordered.
 */
let cartWrites: Promise<unknown> = Promise.resolve();

function enqueueCartWrite<Result>(
    baseQuery: (args: FetchArgs) => unknown,
    args: FetchArgs,
): Promise<QueryReturnValue<Result, FetchBaseQueryError, object>> {
    const run = cartWrites.then(() => baseQuery(args)) as Promise<
        QueryReturnValue<Result, FetchBaseQueryError, object>
    >;

    // A refused write must not strand the taps queued behind it.
    cartWrites = run.then(
        () => undefined,
        () => undefined,
    );

    return run;
}

/** Optimistic lines whose own add has not come back from the server yet. */
const pendingLines = new Set<string>();

let tempLineSeq = 0;

function nextTempLineId() {
    tempLineSeq += 1;
    return `temp-${Date.now()}-${tempLineSeq}`;
}

/** True while a line exists only in the cache, so its id means nothing to the server. */
export function isPendingLine(orderItemId: string) {
    return orderItemId.startsWith("temp-");
}

/**
 * A cart the server no longer has. Reloading it is the only honest answer —
 * otherwise the panel keeps showing lines that every further edit will refuse.
 */
function recoverFromMissingOrder(
    dispatch: (action: unknown) => unknown,
    cause: unknown,
) {
    const status = (cause as { error?: { status?: unknown } })?.error?.status;

    if (status === 409) {
        dispatch(posOrderApi.util.invalidateTags(["PosOrder"]));
    }
}

/**
 * Mirrors the backend's TaxCalculator so an optimistic cart edit never shows
 * a tax-free total for the instant before the real response lands — the
 * order's own taxRate/taxInclusionType carry over unchanged by a line edit,
 * only the amount they apply to does.
 */
function optimisticTotal(
    subtotal: number,
    discountAmount: number,
    taxRate: number | null | undefined,
    taxInclusionType: string | null | undefined,
): { taxAmount: number; total: number } {
    const round2 = (value: number) => Math.round(value * 100) / 100;
    const net = Math.max(0, subtotal - discountAmount);
    const rate = taxRate ?? 0;

    if (!rate) {
        return { taxAmount: 0, total: round2(net) };
    }

    if (taxInclusionType === "INCLUSIVE") {
        const pretax = net / (1 + rate / 100);
        return { taxAmount: round2(net - pretax), total: round2(net) };
    }

    const taxAmount = round2(net * (rate / 100));
    return { taxAmount, total: round2(net + taxAmount) };
}

/**
 * Puts the server's order into the cache without dropping lines whose own add
 * is still in flight.
 *
 * Every cart write answers with the whole order, so the response is the truth —
 * but only as of the tap that asked for it. Ignoring it whenever anything else
 * was in flight (as this used to) left the cart holding temporary line ids that
 * no later edit could resolve; taking it wholesale would blink the not-yet-saved
 * taps out of the panel. Merging keeps both.
 */
function handleFulfilled(dispatch: any, data: PosOrder | null) {
    if (!data) return;

    dispatch(
        posOrderApi.util.updateQueryData(
            "getCurrentOrder",
            undefined,
            (draft) => {
                const stillAdding =
                    draft?.items.filter((line) => pendingLines.has(line.id)) ??
                    [];

                if (!draft || stillAdding.length === 0) return data;

                Object.assign(draft, data, {
                    items: [...data.items, ...stillAdding],
                });

                draft.subtotal = draft.items.reduce(
                    (sum, line) => sum + line.lineTotal + line.discountAmount,
                    0,
                );

                const { taxAmount, total } = optimisticTotal(
                    draft.subtotal,
                    draft.discountAmount,
                    draft.taxRate,
                    draft.taxInclusionType,
                );

                draft.taxAmount = taxAmount;
                draft.total = total;
            },
        ),
    );
}

export const posOrderApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCurrentOrder: builder.query<PosOrder | null, void>({
            // Behind the writes, not alongside them: a read that overtakes a
            // pending edit answers with the cart as it was and puts that stale
            // answer in the cache, undoing the edit on screen.
            queryFn: (_arg, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder | null>(baseQuery, {
                    url: "/orders/current",
                }),
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
            queryFn: (body, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
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
            queryFn: (orderId, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
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
            queryFn: (
                { itemId, variantId, unitId, addOnIds, quantity },
                _api,
                _extraOptions,
                baseQuery,
            ) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
                    url: "/orders/current/items",
                    method: "POST",
                    body: { itemId, variantId, unitId, addOnIds, quantity },
                }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                inFlightCount++;
                // One id for whichever branch below rings this tap up, so the
                // line can be recognised as still-unsaved until it comes back.
                const tempLineId = nextTempLineId();
                const patchResult = dispatch(
                    posOrderApi.util.updateQueryData(
                        "getCurrentOrder",
                        undefined,
                        (draft) => {
                            const currentDraft = draft;
                            if (!currentDraft) {
                                pendingLines.add(tempLineId);
                                return {
                                    id: `offline-${Date.now()}`,
                                    businessId: "1",
                                    customerId: typeof window !== "undefined" ? (localStorage.getItem("pos_active_customer_id") || null) : null,
                                    invoiceNumber: null,
                                    channel: "POS",
                                    status: "PENDING",
                                    currency: "USD",
                                    displayCurrency: null,
                                    displayExchangeRate: null,
                                    note: null,
                                    createdDate: null,
                                    items: [
                                        {
                                            id: tempLineId,
                                            itemId: arg.itemId,
                                            variantId: arg.variantId ?? null,
                                            unitId: arg.unitId ?? null,
                                            itemName: arg.itemName ?? "Item",
                                            quantity: arg.quantity || 1,
                                            unitPrice: arg.unitPrice ?? 0,
                                            discountAmount: 0,
                                            lineTotal: (arg.quantity || 1) * (arg.unitPrice ?? 0),
                                        },
                                    ],
                                    subtotal: (arg.quantity || 1) * (arg.unitPrice ?? 0),
                                    discountAmount: 0,
                                    taxAmount: 0,
                                    total: (arg.quantity || 1) * (arg.unitPrice ?? 0),
                                } satisfies PosOrder;
                            }
                            const addQty = arg.quantity || 1;
                            const existingIndex = currentDraft.items.findIndex(
                                (item) =>
                                    item.itemId === arg.itemId &&
                                    (!arg.variantId ||
                                        item.variantId === arg.variantId) &&
                                    (item.unitId ?? undefined) ===
                                    arg.unitId &&
                                    (item.addOns || [])
                                        .map((addOn) => addOn.addOnId)
                                        .sort()
                                        .join() ===
                                    [...(arg.addOnIds || [])]
                                        .sort()
                                        .join(),
                            );

                            if (existingIndex !== -1) {
                                const existing = currentDraft.items[existingIndex];
                                existing.quantity += addQty;
                                existing.lineTotal =
                                    existing.quantity * existing.unitPrice -
                                    existing.discountAmount;
                            } else {
                                const unitPrice = arg.unitPrice ?? 0;
                                const lineTotal = addQty * unitPrice;
                                pendingLines.add(tempLineId);
                                currentDraft.items.push({
                                    id: tempLineId,
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

                            currentDraft.subtotal = currentDraft.items.reduce(
                                (sum, i) => sum + i.lineTotal + i.discountAmount,
                                0,
                            );
                            const { taxAmount, total } = optimisticTotal(
                                currentDraft.subtotal,
                                currentDraft.discountAmount,
                                currentDraft.taxRate,
                                currentDraft.taxInclusionType,
                            );
                            currentDraft.taxAmount = taxAmount;
                            currentDraft.total = total;
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    pendingLines.delete(tempLineId);
                    handleFulfilled(dispatch, data);
                } catch (cause) {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    pendingLines.delete(tempLineId);
                    if (inFlightCount === 0 && (typeof window === "undefined" || navigator.onLine)) {
                        patchResult.undo();
                    }
                    recoverFromMissingOrder(dispatch, cause);
                }
            },
        }),

        updateOrderItem: builder.mutation<
            PosOrder,
            { orderItemId: string } & UpdateOrderItemInput
        >({
            queryFn: ({ orderItemId, quantity }, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
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
                                const { taxAmount, total } = optimisticTotal(
                                    draft.subtotal,
                                    draft.discountAmount,
                                    draft.taxRate,
                                    draft.taxInclusionType,
                                );
                                draft.taxAmount = taxAmount;
                                draft.total = total;
                            }
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch (cause) {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0 && (typeof window === "undefined" || navigator.onLine)) {
                        patchResult.undo();
                    }
                    recoverFromMissingOrder(dispatch, cause);
                }
            },
        }),

        removeOrderItem: builder.mutation<PosOrder | null, string>({
            queryFn: (orderItemId, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder | null>(baseQuery, {
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
                            const { taxAmount, total } = optimisticTotal(
                                draft.subtotal,
                                draft.discountAmount,
                                draft.taxRate,
                                draft.taxInclusionType,
                            );
                            draft.taxAmount = taxAmount;
                            draft.total = total;
                        },
                    ),
                );

                try {
                    const { data } = await queryFulfilled;
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    handleFulfilled(dispatch, data);
                } catch (cause) {
                    inFlightCount = Math.max(0, inFlightCount - 1);
                    if (inFlightCount === 0 && (typeof window === "undefined" || navigator.onLine)) {
                        patchResult.undo();
                    }
                    recoverFromMissingOrder(dispatch, cause);
                }
            },
        }),

        renameOrder: builder.mutation<PosOrder, { note: string }>({
            queryFn: (body, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
                    url: "/orders/current/rename",
                    method: "PATCH",
                    body,
                }),
            onQueryStarted: writeBackOrder,
        }),

        clearOrder: builder.mutation<null, void>({
            queryFn: (_arg, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<null>(baseQuery, {
                    url: "/orders/current/clear",
                    method: "POST",
                }),
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
            // Queued so the code is priced off the finished cart, never off one
            // with a tap still on its way to the server.
            queryFn: (_arg, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<Khqr>(baseQuery, {
                    url: "/orders/current/khqr",
                    method: "POST",
                }),
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
            queryFn: (body, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
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
            queryFn: (body, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<PosOrder>(baseQuery, {
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
                            const { taxAmount, total } = optimisticTotal(
                                draft.subtotal,
                                body.discountAmount,
                                draft.taxRate,
                                draft.taxInclusionType,
                            );
                            draft.taxAmount = taxAmount;
                            draft.total = total;
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
            // Last in the queue, so payment settles the cart the cashier can
            // see rather than one an unfinished tap is about to change.
            queryFn: (body, _api, _extraOptions, baseQuery) =>
                enqueueCartWrite<Sale>(baseQuery, {
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



