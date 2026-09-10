import { z } from "zod";

export type RegisterSession = {
    id: number;
    registerId: number;
    registerName: string | null;
    userId: string | null;

    cashierName?: string | null;
    cashierNames?: string[] | null;
    orderCount?: number | null;
    businessId: string | null;
    openedAt: string | null;
    closedAt: string | null;

    currency?: string | null;
    openingBalance: number;
    baseOpeningBalance?: number | null;
    secondaryCurrency?: string | null;
    secondaryOpeningBalance?: number | null;
    secondaryExchangeRate?: number | null;
    totalCashSales: number;
    totalPaidIn: number;
    totalPaidOut: number;
    expectedAmount: number;
    actualAmount: number | null;
    baseActualAmount?: number | null;
    secondaryActualAmount?: number | null;
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
    baseOpeningBalance: z.number().finite().min(0).optional(),
    secondaryCurrency: z.string().trim().max(10).optional(),
    secondaryOpeningBalance: z.number().finite().min(0).optional(),
    secondaryExchangeRate: z.number().finite().positive().optional(),
    note: z.string().trim().max(500).optional(),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

export const closeSessionSchema = z.object({

    actualAmount: z
        .number({ message: "Enter the counted amount." })
        .finite("Enter the counted amount.")
        .min(0, "Counted cash cannot be negative."),
    baseActualAmount: z.number().finite().min(0).optional(),
    secondaryCurrency: z.string().trim().max(10).optional(),
    secondaryActualAmount: z.number().finite().min(0).optional(),
    secondaryExchangeRate: z.number().finite().positive().optional(),
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
        baseOpeningBalance: session.baseOpeningBalance != null ? money(session.baseOpeningBalance) : undefined,
        secondaryOpeningBalance: session.secondaryOpeningBalance != null ? money(session.secondaryOpeningBalance) : undefined,
        secondaryExchangeRate: session.secondaryExchangeRate != null ? money(session.secondaryExchangeRate) : undefined,
        actualAmount: session.actualAmount != null ? money(session.actualAmount) : null,
        baseActualAmount: session.baseActualAmount != null ? money(session.baseActualAmount) : undefined,
        secondaryActualAmount: session.secondaryActualAmount != null ? money(session.secondaryActualAmount) : undefined,
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
