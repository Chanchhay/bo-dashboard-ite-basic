/**
 * What the shop made, and where it made it.
 *
 * Revenue on its own cannot say whether a channel is worth running: one that
 * discounts hard can take the most money and keep the least of it. Every
 * figure here is totalled by the database over the whole range, not summed
 * from a page of orders — a total that stops at a thousand rows is worse than
 * no total at all.
 */

export type OrderChannelCode = "POS" | "TELEGRAM" | "MESSENGER" | "WEB";

export type ChannelProfit = {
    /** Null on the total row, which is every channel at once. */
    channel: OrderChannelCode | null;
    sales: number;
    itemsSold: number;
    /** Before discounts. */
    grossSales: number;
    discounts: number;
    /** What was actually taken. */
    revenue: number;
    /** What the stock cost, batch by batch, as recorded at each sale. */
    cost: number;
    /** `revenue - cost`. Negative when it sold below cost. */
    profit: number;
    /** Null when nothing was taken — no margin, rather than a margin of zero. */
    marginPercent: number | null;
};

export type SalesProfit = {
    channels: ChannelProfit[];
    total: ChannelProfit;
};

/** How finely a report cuts the range it covers. */
export const reportGranularities = {
    DAY: "Daily",
    WEEK: "Weekly",
    MONTH: "Monthly",
    YEAR: "Yearly",
} as const;

export type ReportGranularity = keyof typeof reportGranularities;

/**
 * One period of trading, as a set of books would record it.
 *
 * Revenue is net of tax. Tax charged is money held for the tax authority and
 * never the shop's to keep, so counting it as revenue would inflate both the
 * profit and the margin by whatever rate the shop happens to charge. It sits
 * in its own column, where it reads as what it is — a liability, and the
 * figure a return is filed on.
 */
export type PeriodProfit = {
    /** The first day of the period. Null on the total row. */
    periodStart: string | null;
    sales: number;
    itemsSold: number;
    /** Before discounts. */
    grossSales: number;
    discounts: number;
    /** Collected on behalf of the tax authority. Never part of profit. */
    tax: number;
    /** What was taken and kept, with tax taken back out. */
    revenue: number;
    /** What the stock cost, batch by batch, as recorded at each sale. */
    cost: number;
    /** `revenue - cost`. Negative when it sold below cost. */
    profit: number;
    /** Null when nothing was taken — no margin, rather than a margin of zero. */
    marginPercent: number | null;
};

export type PeriodProfitReport = {
    granularity: ReportGranularity;
    periods: PeriodProfit[];
    total: PeriodProfit;
};

/**
 * What to call one period, given how finely the range was cut.
 *
 * A month is named, a year is a number, and a day and a week are dates — a
 * week reads as the day it started, because "week 34" is a thing only a
 * spreadsheet says.
 */
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

/**
 * What one item sold over a range, and what was kept on it.
 *
 * Revenue is the sum of the sale lines — unit price times quantity, less what
 * was discounted off that line, add-ons included. Deliberately not the
 * statement's revenue: a discount given against a whole order belongs to no
 * single line, so the two agree only when every discount was given at the
 * line. The statement stays the figure the books are kept on.
 */
export type ItemProfit = {
    /** Null on the total row, which belongs to no single item. */
    itemId: string | null;
    /** The option sold, when the item is sold in options. */
    variantId: string | null;
    /** As it was called on the receipt, so a renamed item still reads back. */
    itemName: string | null;
    variantName: string | null;
    quantitySold: number;
    /** How many separate sale lines it appeared on. */
    lines: number;
    discounts: number;
    revenue: number;
    cost: number;
    profit: number;
    /** Null when nothing was taken — no margin, rather than a margin of zero. */
    marginPercent: number | null;
};

export type ItemProfitReport = {
    items: ItemProfit[];
    total: ItemProfit;
};

/** What one channel took on one day. Absent for a day it sold nothing. */
export type DailyChannelRevenue = {
    date: string;
    channel: OrderChannelCode;
    revenue: number;
};

/** The ranges worth asking for, and how far back each one reaches. */
export const profitRanges = {
    TODAY: "Today",
    WEEK: "Last 7 days",
    MONTH: "Last 30 days",
    YEAR: "Last 12 months",
    ALL: "All time",
} as const;

export type ProfitRange = keyof typeof profitRanges;

/**
 * The start of a range, as a local timestamp.
 *
 * Null for all time, which the API reads as no lower bound rather than as the
 * beginning of the epoch.
 */
export function profitRangeStart(range: ProfitRange, now = new Date()) {
    if (range === "ALL") return null;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (range === "WEEK") start.setDate(start.getDate() - 6);
    if (range === "MONTH") start.setDate(start.getDate() - 29);
    if (range === "YEAR") start.setMonth(start.getMonth() - 12);

    return start;
}

/**
 * `YYYY-MM-DDTHH:mm:ss`, in the shop's own time.
 *
 * Not an ISO instant: the backend reads these as `LocalDateTime`, and a `Z`
 * suffix would shift the boundary by the offset — closing "today" hours early
 * or late depending on which side of UTC the shop sits.
 */
export function toLocalDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}
