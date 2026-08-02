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
 * Which session this browser has open.
 *
 * There is no "current session" endpoint — `/sessions/{id}/summary` needs an
 * id we already hold — so the id is what we have to remember. It lives in an
 * httpOnly cookie rather than Redux so a refresh, a closed tab, or a locked
 * screen can't strand a cashier with an open drawer they can no longer close.
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
