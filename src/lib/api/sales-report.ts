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

/**
 * What one channel took on one day.
 *
 * A day a channel sold nothing has no row at all, rather than a row of zero —
 * the backend groups what exists and does not invent the gaps. A caller
 * plotting a continuous line has to fill them itself, over whatever range it
 * asked for.
 */
export type DailyChannelRevenue = {
    /** `YYYY-MM-DD`, in the shop's own time. */
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
