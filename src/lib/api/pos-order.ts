import { z } from "zod";


export type PosOrderItem = {
    id: string;
    itemId: string;
    variantId: string | null;
    
    variantName?: string | null;
    
    unitId?: string | null;
    unitName?: string | null;
    unitFactor?: number | null;
    
    addOns?: { addOnId: string | null; name: string; unitPrice: number }[];
    
    selections?: { attributeName: string; value: string; label: string }[];
    itemName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
    trackInventory?: boolean | null;
};

export type TaxInclusionType = "INCLUSIVE" | "EXCLUSIVE";


export type PosOrder = {
    id: string;
    businessId: string;
    customerId: string | null;
    invoiceNumber: string | null;
    channel: "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
    
    status: "PENDING" | "CONFIRMED" | "PAID" | "FAILED" | "CANCELLED";
    
    paymentMethod?: "CASH" | "DIGITAL" | "PAY_LATER" | null;
    subtotal: number;
    discountAmount: number;
    discountId?: string | null;
    discountCode?: string | null;
    taxRate?: number | null;
    taxAmount?: number | null;
    taxInclusionType?: TaxInclusionType | null;
    total: number;
    currency: string;
    
    displayCurrency: string | null;
    displayExchangeRate: number | null;
    note: string | null;
    
    awaitingPayLaterApproval?: boolean;
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


export type OrderSummary = {
    totals: {
        orders: number;
        revenue: number;
        paid: number;
        pending: number;
    };
    
    truncated: boolean;
};

export type OrderStatusFilter = PosOrder["status"] | "ALL";
export type OrderChannelFilter = PosOrder["channel"] | "ALL";

export type OrderHistoryQuery = {
    status?: OrderStatusFilter;
    channel?: OrderChannelFilter;
    
    from?: string;
    to?: string;
};


export type OrderPageQuery = OrderHistoryQuery & {
    page?: number;
    size?: number;
};


export const ORDER_PAGE_SIZES = [10, 25, 50] as const;


export const DEFAULT_PAGE_SIZE: (typeof ORDER_PAGE_SIZES)[number] = 25;


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


export const POS_ORDER_COOKIE = "pos_order_id";

export const addOrderItemSchema = z.object({
    itemId: z.uuid("Select a valid item."),
    variantId: z.uuid().optional(),
    
    unitId: z.uuid().optional(),
    
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
    
    
    quantity: z.coerce
        .number()
        .int("Quantity must be a whole number.")
        .positive("Quantity must be at least 1."),
});

export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;

export const payOrderSchema = z.object({
    paymentMethod: z.enum(["CASH", "DIGITAL", "PAY_LATER"]),
    
    receivedAmount: z.coerce.number().nonnegative().optional(),
    note: z.string().trim().max(200).optional(),
    isTaxActive: z.boolean().optional(),
    isTaxInclusive: z.boolean().optional(),
    taxInclusionType: z.enum(["INCLUSIVE", "EXCLUSIVE"]).optional(),
    taxRate: z.coerce.number().optional(),
    taxAmount: z.coerce.number().optional(),
    discountId: z.string().optional(),
    discountCode: z.string().optional(),
});

export type PayOrderInput = z.infer<typeof payOrderSchema>;

export const setOrderCustomerSchema = z.object({
    customerId: z.string().nullable().optional(),
});

export const setOrderDiscountSchema = z.object({
    discountAmount: z.coerce.number().min(0, "Discount amount cannot be negative."),
    discountId: z.string().nullable().optional(),
    discountCode: z.string().nullable().optional(),
});

export type SetOrderCustomerInput = z.infer<typeof setOrderCustomerSchema>;
export type SetOrderDiscountInput = z.infer<typeof setOrderDiscountSchema>;


export type Khqr = {
    
    qr: string | null;
    md5: string | null;
    amount: number;
    currency: string;
    billNumber: string | null;
    
    expiresAt: string | null;
    
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


export type Sale = {
    id: string;
    orderId: string;
    invoiceNumber: string | null;
    cashierId: string | null;
    
    customerId: string | null;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    channel: "POS" | "TELEGRAM" | "MESSENGER" | "WEB";
    subtotal: number;
    discountAmount: number;
    taxRate?: number | null;
    taxAmount?: number | null;
    taxInclusionType?: TaxInclusionType | null;
    totalAmount: number;
    paidAmount: number;
    
    changeAmount: number;
    currency: string;
    
    displayCurrency: string | null;
    displayExchangeRate: number | null;
    paymentMethod: "CASH" | "DIGITAL" | "PAY_LATER";
    itemCount: number;
    note: string | null;
    soldAt: string | null;
};
