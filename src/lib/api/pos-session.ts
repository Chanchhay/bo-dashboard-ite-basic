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
    /**
     * These two are absent from api-docs/api.json but present on every live
     * response — the spec is behind the service. Optional so a spec-shaped
     * payload still typechecks.
     */
    cashierName?: string | null;
    orderCount?: number | null;
    businessId: string | null;
    openedAt: string | null;
    closedAt: string | null;
    /**
     * The currency this till was counted in, fixed when it opened. Null on
     * sessions recorded before the field existed; those fall back to the
     * business base currency.
     */
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
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Narrows the backend payload to the shape the register screens rely on. */
export function normalizeRegisterSession(
    session: RegisterSession,
): RegisterSession {
    return {
        ...session,
        openingBalance: money(session.openingBalance),
        totalCashSales: money(session.totalCashSales),
        totalPaidIn: money(session.totalPaidIn),
        totalPaidOut: money(session.totalPaidOut),
        expectedAmount: money(session.expectedAmount),
    };
}

/**
 * One page of the business's session history, and the totals behind it.
 *
 * The backend pages this because a shop opens a drawer every trading day, so
 * the history grows without bound and a summary is not cheap enough to build
 * for all of it at once. The metrics cover everything the filter matched, not
 * the page being shown — a total that changed each time you clicked "next"
 * would not be a total.
 */
export type RegisterSessionPage = {
    content: RegisterSession[];
    /** Zero-based, as Spring counts pages. */
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
};

export type RegisterSessionMetrics = {
    /** Drawers open right now. Not narrowed by the filter. */
    activeCount: number;
    totalOpening: number;
    totalCashSales: number;
    /** Over and short added as distances, so they do not cancel out. */
    totalDiscrepancies: number;
};

export type RegisterSessionSearch = {
    page: RegisterSessionPage;
    metrics: RegisterSessionMetrics;
};

/** Narrows the search payload, defaulting anything the backend left out. */
export function normalizeRegisterSessionSearch(
    payload: Partial<RegisterSessionSearch> | null | undefined,
    requested: { page: number; size: number },
): RegisterSessionSearch {
    const page = payload?.page;
    const content = (page?.content ?? []).map(normalizeRegisterSession);
    const size = page?.size ?? requested.size;
    const totalElements = page?.totalElements ?? content.length;
    const totalPages =
        page?.totalPages ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
    const number = page?.page ?? requested.page;

    return {
        page: {
            content,
            page: number,
            size,
            totalElements,
            totalPages,
            first: page?.first ?? number <= 0,
            last: page?.last ?? number >= totalPages - 1,
            empty: page?.empty ?? content.length === 0,
        },
        metrics: {
            activeCount: money(payload?.metrics?.activeCount),
            totalOpening: money(payload?.metrics?.totalOpening),
            totalCashSales: money(payload?.metrics?.totalCashSales),
            totalDiscrepancies: money(payload?.metrics?.totalDiscrepancies),
        },
    };
}
