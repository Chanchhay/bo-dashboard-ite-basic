import { z } from "zod";

/**
 * The cashier's open register session.
 *
 * The backend gives each business exactly one register, provisioned with the
 * business account, so opening a session takes no register id — `POST
 * /api/v1/sessions/open` resolves it from the caller's business.
 */
export type RegisterSession = {
    id: number;
    registerId: number;
    registerName: string | null;
    userId: string | null;
    cashierName?: string | null;
    openedBy?: string | null;
    closedBy?: string | null;
    orderCount?: number | null;
    businessId: string | null;
    openedAt: string | null;
    closedAt: string | null;
    currency?: string | null;
    openingBalance: number;
    totalCashSales: number;
    totalPaidIn: number;
    totalPaidOut: number;
    expectedAmount: number;
    actualAmount: number | null;
    differenceAmount: number | null;
    reconciliationStatus: string | null;
    status: "OPEN" | "CLOSED";
    note: string | null;
};

export type CashMovement = {
    id: number;
    sessionId: number;
    type: "PAID_IN" | "PAID_OUT";
    currency?: string | null;
    amount: number;
    reason?: string | null;
    createdAt: string;
};

/**
 * Which shared session this browser has joined.
 *
 * `/sessions/current` discovers the store-wide drawer across browsers. After
 * the authenticated user joins it, this httpOnly cookie keeps the session id
 * available to order and close-register BFF routes without exposing it to
 * client JavaScript.
 */
export const POS_SESSION_COOKIE = "pos_session_id";

export const openSessionSchema = z.object({
    /** Counted cash in the drawer at the start of the shift. */
    openingBalance: z
        .number({ message: "Enter the starting cash amount." })
        .finite("Enter the starting cash amount.")
        .min(0, "Starting cash cannot be negative."),
    note: z.string().trim().max(500).optional(),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

export const closeSessionSchema = z.object({
    /** Counted cash in the drawer at the end of the shift. */
    actualAmount: z
        .number({ message: "Enter the counted amount." })
        .finite("Enter the counted amount.")
        .min(0, "Counted cash cannot be negative."),
    closingNote: z.string().trim().max(500).optional(),
});

/**
 * Cash figures arrive as JSON numbers. Anything missing is treated as zero so
 * the register screens can do arithmetic without null-guarding every field.
 */
function money(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

/** Extracts a displayable name string from nested user/person objects or raw strings */
function extractPersonName(val: unknown): string | null {
    if (!val) return null;
    if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed && trimmed !== "[object Object]" ? trimmed : null;
    }
    if (typeof val === "object" && val !== null) {
        const o = val as Record<string, unknown>;
        const name =
            (o.fullName as string) ||
            (o.name as string) ||
            (o.username as string) ||
            (o.email as string) ||
            (o.firstName ? `${o.firstName} ${o.lastName || ""}`.trim() : null);
        return name ? String(name) : null;
    }
    return null;
}

/** Narrows the backend payload to the shape the register screens rely on. */
export function normalizeRegisterSession(
    rawSession: any,
): RegisterSession {
    if (!rawSession || typeof rawSession !== "object") {
        return {
            id: 0,
            registerId: 1,
            registerName: "Main Register",
            userId: null,
            cashierName: "Cashier",
            openedBy: null,
            closedBy: null,
            orderCount: 0,
            businessId: null,
            openedAt: null,
            closedAt: null,
            currency: "USD",
            openingBalance: 0,
            totalCashSales: 0,
            totalPaidIn: 0,
            totalPaidOut: 0,
            expectedAmount: 0,
            actualAmount: null,
            differenceAmount: null,
            reconciliationStatus: null,
            status: "CLOSED",
            note: null,
        };
    }

    const s = rawSession;

    const openedBy =
        extractPersonName(s.openedBy) ??
        extractPersonName(s.opened_by) ??
        extractPersonName(s.openedByUser) ??
        extractPersonName(s.openedByName) ??
        extractPersonName(s.created_by) ??
        extractPersonName(s.createdBy) ??
        null;

    const closedBy =
        extractPersonName(s.closedBy) ??
        extractPersonName(s.closed_by) ??
        extractPersonName(s.closedByUser) ??
        extractPersonName(s.closedByName) ??
        extractPersonName(s.updated_by) ??
        extractPersonName(s.updatedBy) ??
        null;

    const cashierName =
        extractPersonName(s.cashierName) ??
        extractPersonName(s.cashier_name) ??
        extractPersonName(s.cashier) ??
        extractPersonName(s.user) ??
        extractPersonName(s.userProfile) ??
        openedBy ??
        "Cashier";

    const openedAt =
        s.openedAt ??
        s.opened_at ??
        s.openedDate ??
        s.opened_date ??
        s.startTime ??
        s.start_time ??
        s.created_date ??
        s.createdAt ??
        null;

    const closedAt =
        s.closedAt ??
        s.closed_at ??
        s.closedDate ??
        s.closed_date ??
        s.endTime ??
        s.end_time ??
        s.last_modified_date ??
        s.updatedAt ??
        null;

    const isClosed = Boolean(
        closedAt ||
        s.status === "CLOSED" ||
        s.status === "closed" ||
        s.status === "COMPLETED" ||
        s.status === "FINISHED"
    );
    const status: "OPEN" | "CLOSED" = isClosed ? "CLOSED" : "OPEN";

    const openingBalance = money(
        s.openingBalance ??
        s.opening_balance ??
        s.openingCash ??
        s.opening_cash ??
        s.startFloat ??
        s.startingBalance
    );

    const totalCashSales = money(
        s.totalCashSales ??
        s.total_cash_sales ??
        s.cashSales ??
        s.cash_sales ??
        s.salesTotal
    );

    const totalPaidIn = money(
        s.totalPaidIn ??
        s.total_paid_in ??
        s.paidIn ??
        s.payIn
    );

    const totalPaidOut = money(
        s.totalPaidOut ??
        s.total_paid_out ??
        s.paidOut ??
        s.payOut
    );

    const expectedAmount =
        money(
            s.expectedAmount ??
            s.expected_amount ??
            s.expectedTotal ??
            s.expected_total
        ) || (openingBalance + totalCashSales + totalPaidIn - totalPaidOut);

    const rawActual =
        s.actualAmount ??
        s.actual_amount ??
        s.actualTotal ??
        s.actual_total ??
        s.countedCash ??
        s.counted_cash ??
        s.closingBalance ??
        s.closing_balance;

    const actualAmount = rawActual != null ? money(rawActual) : null;

    const rawDiff =
        s.differenceAmount ??
        s.difference_amount ??
        s.difference ??
        s.variance ??
        s.discrepancy;

    const differenceAmount =
        rawDiff != null
            ? money(rawDiff)
            : actualAmount != null
            ? actualAmount - expectedAmount
            : null;

    const registerName = String(
        s.registerName ??
        s.register_name ??
        (typeof s.register === "object" && s.register ? s.register.name || s.register.registerName : null) ??
        (s.registerId ?? s.register_id ? `Register #${s.registerId ?? s.register_id}` : "Main Register")
    );

    return {
        id: Number(s.id ?? s.session_id ?? s.sessionId ?? 0),
        registerId: Number(s.registerId ?? s.register_id ?? 1),
        registerName,
        userId: String(s.userId ?? s.user_id ?? s.created_by ?? ""),
        cashierName,
        openedBy,
        closedBy,
        orderCount: Number(s.orderCount ?? s.order_count ?? s.totalOrders ?? 0),
        businessId: s.businessId ?? s.business_id ?? null,
        openedAt,
        closedAt,
        currency: String(s.currency ?? "USD"),
        openingBalance,
        totalCashSales,
        totalPaidIn,
        totalPaidOut,
        expectedAmount,
        actualAmount,
        differenceAmount,
        reconciliationStatus: String(
            s.reconciliationStatus ??
            s.reconciliation_status ??
            (isClosed ? "CLOSED" : "IN_PROGRESS")
        ),
        status,
        note: s.note ?? s.closing_note ?? s.closingNote ?? s.openingNote ?? s.remark ?? null,
    };
}

