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





export type SessionStatus = "OPEN" | "CLOSED";

const BASE_URL = "/api/register/sessions";

/**
 * Fetch the list of register sessions.
 */
export async function fetchRegisterSessions(): Promise<RegisterSession[]> {
    const res = await fetch(`${BASE_URL}?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch register sessions: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single session's live summary (opening/closing balances,
 * cash sales, expected vs actual, variance, etc).
 */
export async function fetchSessionSummary(sessionId: number | string): Promise<RegisterSession> {
    const res = await fetch(`${BASE_URL}/${sessionId}/summary?t=${Date.now()}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch session summary: ${res.status} ${res.statusText}`);
    }

    return res.json();
}