import { z } from "zod";

/** A line on the current order, as the backend returns it. */
export type PosOrderItem = {
    id: string;
    itemId: string;
    variantId: string | null;
    /** The option chosen, so a line can say which one it is. */
    variantName?: string | null;
    /** The unit sold, and how many base units one of them holds. */
    unitId?: string | null;
    unitName?: string | null;
    unitFactor?: number | null;
    /** Extras on this line, priced as they were when it was rung up. */
    addOns?: { addOnId: string | null; name: string; unitPrice: number }[];
    /**
     * Options the line was ordered with — "Sugar Level: 50%". Costs nothing
     * and consumes nothing; it is how the line has to be made, so the counter
     * needs to see it even though it never reaches the total.
     */
    selections?: { attributeName: string; value: string; label: string }[];
    itemName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
};

export type TaxInclusionType = "INCLUSIVE" | "EXCLUSIVE";

/** The cart. A `PENDING` order the cashier is still building. */
export type PosOrder = {
    id: string;
    businessId: string;
    customerId: string | null;
    invoiceNumber: string | null;
    channel: "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
    status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
    subtotal: number;
    discountAmount: number;
    taxRate?: number | null;
    taxAmount?: number | null;
    taxInclusionType?: TaxInclusionType | null;
    total: number;
    currency: string;
    /** The second currency this order was priced against, frozen at creation. */
    displayCurrency: string | null;
    displayExchangeRate: number | null;
    note: string | null;
    items: PosOrderItem[];
    createdDate: string | null;
};

export type PosOrderPage = {
    content: PosOrder[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
};

/**
 * What Sale Management's stat cards read.
 *
 * Counted over the whole filtered range rather than the page on screen, so the
 * cards keep meaning the same thing as the cashier pages through the table.
 */
export type OrderSummary = {
    totals: {
        orders: number;
        revenue: number;
        paid: number;
        pending: number;
    };
    /** True when the range holds more orders than one read will total up. */
    truncated: boolean;
};

export type OrderStatusFilter = PosOrder["status"] | "ALL";
export type OrderChannelFilter = PosOrder["channel"] | "ALL";

export type OrderHistoryQuery = {
    status?: OrderStatusFilter;
    channel?: OrderChannelFilter;
    /** ISO-8601. Orders created before this are left out. */
    from?: string;
    to?: string;
};

/** The same filters, plus the page of them the table is showing. */
export type OrderPageQuery = OrderHistoryQuery & {
    page?: number;
    size?: number;
};

/** Page sizes the orders table offers. */
export const ORDER_PAGE_SIZES = [10, 25, 50] as const;

/** The size the orders table opens on, before the owner picks another. */
export const DEFAULT_PAGE_SIZE: (typeof ORDER_PAGE_SIZES)[number] = 25;

/** Metadata the backend records when it issues or prints an order receipt. */
export type PosReceipt = {
    id: string;
    orderId: string;
    invoiceNumber: string | null;
    vatNumber: string | null;
    type: "PHYSICAL" | "DIGITAL" | null;
    fileUrl: string | null;
    deviceId: string | null;
    printedBy: string | null;
    printedAt: string | null;
    issuedAt: string | null;
};

export type PosReceiptDetail = {
    order: PosOrder;
    /** A paid order can exist briefly before receipt metadata is generated. */
    receipt: PosReceipt | null;
};

export const parkOrderSchema = z.object({
    note: z
        .string()
        .trim()
        .min(1, "Order name is required.")
        .max(200, "Order name must be 200 characters or fewer.")
        .optional(),
});

export type ParkOrderInput = z.infer<typeof parkOrderSchema>;

/**
 * Which order this terminal is building.
 *
 * Held in an httpOnly cookie for the same reason as the register session: a
 * refresh, a dropped connection or a locked screen must not orphan a cart the
 * cashier has already rung up.
 */
export const POS_ORDER_COOKIE = "pos_order_id";

export const addOrderItemSchema = z.object({
    itemId: z.uuid("Select a valid item."),
    variantId: z.uuid().optional(),
    /**
     * The unit being sold — a case, a six-pack. Left out, the line is sold in
     * the item's base unit, priced at the item's own price.
     */
    unitId: z.uuid().optional(),
    /** Extras chosen on this line. Each must be on sale for the item. */
    addOnIds: z.array(z.uuid()).optional(),
    quantity: z.coerce
        .number()
        .int("Quantity must be a whole number.")
        .positive("Quantity must be at least 1.")
        .default(1),
    itemName: z.string().optional(),
    unitPrice: z.number().optional(),
});

export const updateOrderItemSchema = z.object({
    // The backend rejects 0 — removing a line is DELETE, not a quantity of
    // nothing, so the UI must not be able to express it here.
    quantity: z.coerce
        .number()
        .int("Quantity must be a whole number.")
        .positive("Quantity must be at least 1."),
});

export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;

export const payOrderSchema = z.object({
    paymentMethod: z.enum(["CASH", "DIGITAL"]),
    /** Cash tendered. Absent for digital, where there is nothing to hand over. */
    receivedAmount: z.coerce.number().nonnegative().optional(),
    note: z.string().trim().max(200).optional(),
    isTaxActive: z.boolean().optional(),
    isTaxInclusive: z.boolean().optional(),
    taxInclusionType: z.enum(["INCLUSIVE", "EXCLUSIVE"]).optional(),
    taxRate: z.coerce.number().optional(),
    taxAmount: z.coerce.number().optional(),
});

export type PayOrderInput = z.infer<typeof payOrderSchema>;

export const setOrderCustomerSchema = z.object({
    customerId: z.string().nullable().optional(),
});

export const setOrderDiscountSchema = z.object({
    discountAmount: z.coerce.number().min(0, "Discount amount cannot be negative."),
    discountId: z.string().optional(),
    discountCode: z.string().optional(),
});

export type SetOrderCustomerInput = z.infer<typeof setOrderCustomerSchema>;
export type SetOrderDiscountInput = z.infer<typeof setOrderDiscountSchema>;

/** A KHQR the customer scans to pay. */
export type Khqr = {
    /** The raw EMV payload, if the terminal has to render its own code. */
    qr: string | null;
    md5: string | null;
    amount: number;
    currency: string;
    billNumber: string | null;
    /** When the code stops being valid, ISO-8601. */
    expiresAt: string | null;
    /** A ready-made image, usually a data URI. */
    qrImage: string | null;
};

export type PaymentStatus = {
    orderId: string;
    orderStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
    qrStatus: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
    paid: boolean;
    message: string | null;
    expiresAt: string | null;
    paidAt: string | null;
};

/** The completed sale — the receipt's source of truth. */
export type Sale = {
    id: string;
    orderId: string;
    invoiceNumber: string | null;
    cashierId: string | null;
    channel: "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
    subtotal: number;
    discountAmount: number;
    taxRate?: number | null;
    taxAmount?: number | null;
    taxInclusionType?: TaxInclusionType | null;
    totalAmount: number;
    paidAmount: number;
    /** What to hand back. Calculated by the backend, never re-derived here. */
    changeAmount: number;
    currency: string;
    /**
     * The second currency shown at the time of sale, with the rate it was
     * priced at. Frozen by the backend so a later rate change cannot alter
     * figures already printed on a receipt.
     */
    displayCurrency: string | null;
    displayExchangeRate: number | null;
    paymentMethod: "CASH" | "DIGITAL";
    itemCount: number;
    note: string | null;
    soldAt: string | null;
};
