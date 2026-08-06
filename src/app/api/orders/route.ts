import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { OrderHistory, PosOrder, PosOrderPage } from "@/lib/api/pos-order";
import { ordersPath } from "@/lib/api/pos-order-backend";

type BackendOrderPage = {
    content?: PosOrder[];
    page?: Partial<PosOrderPage["page"]>;
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
};

type SearchFilter = {
    column: string;
    value: string;
    operation: string;
};

const STATUSES = ["PENDING", "PAID", "FAILED", "CANCELLED"] as const;
const CHANNELS = ["POS", "TELEGRAM", "MESSENGER", "WEB"] as const;

/**
 * The whole range is read so the totals are the range's totals, not the first
 * page's. Ranges are small for a single store, but "All time" is not bounded by
 * anything, so the read stops here and says so rather than paging forever.
 */
const PAGE_SIZE = 200;
const MAX_ORDERS = 1000;

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
 * A cart the cashier opened and never rang anything into is not an order any
 * owner would recognise, so it stays out of the history the way it stays out
 * of the open-orders list.
 */
function isRealOrder(order: PosOrder) {
    return (
        order.status !== "PENDING" ||
        order.items.length > 0 ||
        Boolean(order.note?.trim())
    );
}

/** Every order matching the filters, newest first, up to `MAX_ORDERS`. */
async function loadOrders(businessId: string, filters: SearchFilter[]) {
    const orders: PosOrder[] = [];
    let pageNumber = 0;
    let truncated = false;

    for (;;) {
        const result = await backendRequest<BackendOrderPage>(
            `${ordersPath(businessId, "/filter")}?page=${pageNumber}&size=${PAGE_SIZE}&sort=createdDate,desc`,
            {
                method: "POST",
                body: JSON.stringify({
                    searchRequestDto: filters,
                    globalOperator: "AND",
                }),
            },
        );

        const content = result.content ?? [];
        orders.push(...content);

        const metadata = result.page ?? result;
        const totalPages = metadata.totalPages ?? 1;
        pageNumber += 1;

        if (content.length === 0 || pageNumber >= totalPages) break;

        if (orders.length >= MAX_ORDERS) {
            truncated = true;
            break;
        }
    }

    return { orders: orders.filter(isRealOrder), truncated };
}

/** Lists orders for Sale Management: any status, filtered and totalled. */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const status = oneOf(url.searchParams.get("status"), STATUSES);
        const channel = oneOf(url.searchParams.get("channel"), CHANNELS);
        const from = validIsoDate(url.searchParams.get("from"));
        const to = validIsoDate(url.searchParams.get("to"));

        const filters: SearchFilter[] = [
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

        const businessId = await getCurrentBusinessId();
        const { orders, truncated } = await loadOrders(businessId, filters);

        // Revenue counts paid orders only — a pending or cancelled total is
        // money nobody has taken.
        const paid = orders.filter((order) => order.status === "PAID");

        return Response.json({
            content: orders,
            totals: {
                orders: orders.length,
                revenue: paid.reduce((sum, order) => sum + order.total, 0),
                paid: paid.length,
                pending: orders.filter((order) => order.status === "PENDING")
                    .length,
            },
            truncated,
        } satisfies OrderHistory);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
