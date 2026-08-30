import { z } from "zod";


export type RegisterSession = {
    id: number;
    registerId: number;
    registerName: string | null;
    userId: string | null;
    
    cashierName?: string | null;
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


export const POS_SESSION_COOKIE = "pos_session_id";

export const openSessionSchema = z.object({
    
    openingBalance: z
        .number({ message: "Enter the starting cash amount." })
        .finite("Enter the starting cash amount.")
        .min(0, "Starting cash cannot be negative."),
    note: z.string().trim().max(500).optional(),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

export const closeSessionSchema = z.object({
    
    actualAmount: z
        .number({ message: "Enter the counted amount." })
        .finite("Enter the counted amount.")
        .min(0, "Counted cash cannot be negative."),
    closingNote: z.string().trim().max(500).optional(),
});


function money(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}


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


export type RegisterSessionPage = {
    content: RegisterSession[];
    
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
};

export type RegisterSessionMetrics = {
    
    activeCount: number;
    totalOpening: number;
    totalCashSales: number;
    
    totalDiscrepancies: number;
};

export type RegisterSessionSearch = {
    page: RegisterSessionPage;
    metrics: RegisterSessionMetrics;
};


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
