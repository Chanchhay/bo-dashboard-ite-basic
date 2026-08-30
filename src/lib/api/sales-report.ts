

export type OrderChannelCode = "POS" | "TELEGRAM" | "MESSENGER" | "WEB";

export type ChannelProfit = {
    
    channel: OrderChannelCode | null;
    sales: number;
    itemsSold: number;
    
    grossSales: number;
    discounts: number;
    
    revenue: number;
    
    cost: number;
    
    profit: number;
    
    marginPercent: number | null;
};

export type SalesProfit = {
    channels: ChannelProfit[];
    total: ChannelProfit;
};


export const reportGranularities = {
    DAY: "Daily",
    WEEK: "Weekly",
    MONTH: "Monthly",
    YEAR: "Yearly",
} as const;

export type ReportGranularity = keyof typeof reportGranularities;


export type PeriodProfit = {
    
    periodStart: string | null;
    sales: number;
    itemsSold: number;
    
    grossSales: number;
    discounts: number;
    
    tax: number;
    
    revenue: number;
    
    cost: number;
    
    profit: number;
    
    marginPercent: number | null;
};

export type PeriodProfitReport = {
    granularity: ReportGranularity;
    periods: PeriodProfit[];
    total: PeriodProfit;
};


export function periodLabel(
    periodStart: string,
    granularity: ReportGranularity,
) {
    const date = new Date(`${periodStart}T00:00:00`);

    if (granularity === "YEAR") {
        return String(date.getFullYear());
    }
    if (granularity === "MONTH") {
        return date.toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
        });
    }

    const day = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    return granularity === "WEEK" ? `Week of ${day}` : day;
}


export type ItemProfit = {
    
    itemId: string | null;
    
    variantId: string | null;
    
    itemName: string | null;
    variantName: string | null;
    quantitySold: number;
    
    lines: number;
    discounts: number;
    revenue: number;
    cost: number;
    profit: number;
    
    marginPercent: number | null;
};

export type ItemProfitReport = {
    items: ItemProfit[];
    total: ItemProfit;
};

/**
 * How far back a prediction looks. Deliberately just these two — a single
 * day is too small a sample to trend on, and a year-long window would have
 * "recommended restock" suggest buying a year's stock at once. Week and
 * month are the two horizons an owner can actually act on.
 */
export type PredictionWindow = "WEEK" | "MONTH";

/**
 * One item's forecast for the selected window — no ML, just this item's own
 * recent average and trend. Server-computed so the dashboard tiles and the
 * full Prediction page always agree on the same numbers.
 */
export type PredictionItem = {
    itemId: string;
    name: string;
    currentStock: number;
    avgDailyDemand: number;
    /** Naive forecast: next window assumed roughly equal to the last one. */
    expectedDemandWindow: number;
    /** Null when there's no prior-window baseline to compare against. */
    trendPercent: number | null;
    /** Null when nothing has sold recently, so a rate can't be worked out. */
    estimatedStockoutDays: number | null;
    recommendedRestock: number;
    qtySold30d: number;
};

export type SalesPredictionsResponse = {
    generatedAt: string;
    windowDays: number;
    risingCount: number;
    stockoutSoonCount: number;
    slowMoverCount: number;
    revenueForecast: { low: number; mid: number; high: number };
    items: PredictionItem[];
};

/** What one channel took on one day. Absent for a day it sold nothing. */
export type DailyChannelRevenue = {
    date: string;
    channel: OrderChannelCode;
    revenue: number;
};


export const profitRanges = {
    TODAY: "Today",
    WEEK: "Last 7 days",
    MONTH: "Last 30 days",
    YEAR: "Last 12 months",
    ALL: "All time",
} as const;

export type ProfitRange = keyof typeof profitRanges;


export function profitRangeStart(range: ProfitRange, now = new Date()) {
    if (range === "ALL") return null;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (range === "WEEK") start.setDate(start.getDate() - 6);
    if (range === "MONTH") start.setDate(start.getDate() - 29);
    if (range === "YEAR") start.setMonth(start.getMonth() - 12);

    return start;
}


export function toLocalDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}
