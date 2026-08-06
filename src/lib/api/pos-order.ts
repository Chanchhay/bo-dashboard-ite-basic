import { z } from "zod";

/** A line on the current order, as the backend returns it. */
export type PosOrderItem = {
    id: string;
    itemId: string;
    variantId: string | null;
    itemName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
};

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
    total: number;
    currency: string;
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
 * Every order in a date range, whatever its status — what Sale Management
 * shows. Totals are counted over the whole range rather than the rows on
 * screen, so the stat cards and the table can never disagree.
 */
export type OrderHistory = {
    content: PosOrder[];
    totals: {
        orders: number;
        revenue: number;
        paid: number;
        pending: number;
    };
    /** True when the range holds more orders than one request will load. */
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
    quantity: z.coerce
        .number()
        .int("Quantity must be a whole number.")
        .positive("Quantity must be at least 1.")
        .default(1),
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
});

export type PayOrderInput = z.infer<typeof payOrderSchema>;

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
    totalAmount: number;
    paidAmount: number;
    /** What to hand back. Calculated by the backend, never re-derived here. */
    changeAmount: number;
    currency: string;
    paymentMethod: "CASH" | "DIGITAL";
    itemCount: number;
    note: string | null;
    soldAt: string | null;
};
