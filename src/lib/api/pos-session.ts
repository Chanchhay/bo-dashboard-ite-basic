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
 * One page of the business's session history, newest first.
 *
 * The backend pages this because a shop opens a drawer every trading day, so
 * the history grows without bound and a summary is not cheap enough to build
 * for all of it at once. `totalElements` is the whole history, not the page.
 */
export type RegisterSessionPage = {
    content: RegisterSession[];
    /** Zero-based, as Spring counts pages. */
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

/**
 * A page of sessions as the backend sends it.
 *
 * Spring has shipped the page metadata both flat and nested under `page`
 * depending on version and serialisation settings, and this endpoint is new
 * enough that neither shape is settled. Both are read here so the browser only
 * ever sees {@link RegisterSessionPage}.
 */
type BackendSessionPage = {
    content?: RegisterSession[];
    number?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
    page?: {
        number?: number;
        size?: number;
        totalElements?: number;
        totalPages?: number;
    };
};

export function normalizeRegisterSessionPage(
    payload: BackendSessionPage,
    requested: { page: number; size: number },
): RegisterSessionPage {
    const nested = payload.page ?? null;
    const content = (payload.content ?? []).map(normalizeRegisterSession);

    const number = nested?.number ?? payload.number ?? requested.page;
    const size = nested?.size ?? payload.size ?? requested.size;
    const totalElements =
        nested?.totalElements ?? payload.totalElements ?? content.length;

    return {
        content,
        number,
        size,
        totalElements,
        // Derived only as a fallback: a server that sends the count is the
        // authority, because the last page can be short.
        totalPages:
            nested?.totalPages ??
            payload.totalPages ??
            Math.max(1, Math.ceil(totalElements / Math.max(size, 1))),
    };
}
