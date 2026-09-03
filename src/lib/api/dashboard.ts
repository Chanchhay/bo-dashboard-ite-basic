import type { ReportGranularity } from "@/lib/api/sales-report";

/**
 * The dashboard as the server hands it over — finished.
 *
 * Every figure here arrives ready to draw. The screen picks colours and
 * formats money; it does not sum, rank, accumulate or join. That is not a
 * style preference: a running total, a share of revenue, a ranking and a bar
 * scaled to the largest row are each wrong the moment they are worked out
 * over a page instead of over everything, and the page is all a screen has.
 */

/** The headline figures, each already reduced to the one number shown. */
export type DashboardKpis = {
    revenue: number;
    totalItems: number;
    /** Categories with items actually in them, not categories defined. */
    totalCategories: number;
    inventoryOnHand: number;
};

export type ChannelShare = {
    channel: string;
    /** Whole percent of total revenue; never 0 for a channel that sold something. */
    percentage: number;
    revenue: number;
};

export type ProfitPoint = {
    periodStart: string;
    /** Already named for the granularity asked for. */
    label: string;
    profit: number;
    /** Every period up to and including this one. */
    cumulative: number;
};

export type ProfitTrend = {
    granularity: ReportGranularity;
    /** Oldest first — a running total read backwards is not a running total. */
    points: ProfitPoint[];
};

export type TopItem = {
    itemId: string;
    name: string;
    itemCount: number;
    totalAmount: number;
};

export type StockLevel = {
    itemId: string;
    name: string;
    quantityOnHand: number;
    totalAmount: number;
    /** Share of the largest row, which is what each bar is drawn to. */
    revenuePercent: number;
    countPercent: number;
};

export type DashboardOverview = {
    kpis: DashboardKpis;
    channels: ChannelShare[];
    profitTrend: ProfitTrend;
    topItems: TopItem[];
    stockLevels: StockLevel[];
};

export type RecentOrderRow = {
    orderId: string;
    /** Already prefixed with "#". */
    reference: string;
    customerName: string;
    customerInitials: string;
    customerAvatarUrl: string | null;
    /** The first item and how many rode with it — "Latte +2 more". */
    product: string;
    category: string;
    amount: number;
    /** Said the way the table says it: Paid, Success, Processing, Failed. */
    status: string;
};

export type BestSellingRow = {
    itemId: string;
    name: string;
    category: string;
    sales: number;
    sold: number;
    imageUrl: string | null;
};

/** The shape every paged endpoint on this API answers in. */
export type DashboardPage<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
};
