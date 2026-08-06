import type { OrderFilter } from "@/lib/api/pos-order-backend";
import type { PosOrder } from "@/lib/api/pos-order";

const STATUSES = ["PENDING", "PAID", "FAILED", "CANCELLED"] as const;
const CHANNELS = ["POS", "TELEGRAM", "MESSENGER", "WEB"] as const;

function oneOf<T extends string>(
    value: string | null,
    allowed: readonly T[],
): T | null {
    return allowed.includes((value ?? "") as T) ? (value as T) : null;
}

function validIsoDate(value: string | null) {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The search clauses behind Sale Management's filter bar.
 *
 * The list and the totals must agree on which orders exist, so both read the
 * same query string through here rather than each building their own.
 */
export function orderFiltersFromQuery(url: URL): OrderFilter[] {
    const status = oneOf(url.searchParams.get("status"), STATUSES);
    const channel = oneOf(url.searchParams.get("channel"), CHANNELS);
    const from = validIsoDate(url.searchParams.get("from"));
    const to = validIsoDate(url.searchParams.get("to"));

    return [
        ...(status
            ? [{ column: "status", value: status, operation: "EQUAL" }]
            : []),
        ...(channel
            ? [{ column: "channel", value: channel, operation: "EQUAL" }]
            : []),
        ...(from
            ? [
                  {
                      column: "createdDate",
                      value: from,
                      operation: "GREATER_THAN_EQUAL",
                  },
              ]
            : []),
        ...(to
            ? [
                  {
                      column: "createdDate",
                      value: to,
                      operation: "LESS_THAN_EQUAL",
                  },
              ]
            : []),
    ];
}

/**
 * A cart the cashier opened and never rang anything into is not an order any
 * owner would recognise, so it stays out of the history the way it stays out
 * of the open-orders list.
 */
export function isRealOrder(order: PosOrder) {
    return (
        order.status !== "PENDING" ||
        order.items.length > 0 ||
        Boolean(order.note?.trim())
    );
}

/** Clamps a page number or size from the query string. */
export function boundedInteger(
    value: string | null,
    fallback: number,
    { min = 0, max }: { min?: number; max: number },
) {
    if (value === null) return fallback;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= min
        ? Math.min(parsed, max)
        : fallback;
}
