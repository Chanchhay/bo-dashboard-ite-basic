import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { isRealOrder, orderFiltersFromQuery } from "@/lib/api/order-filters";
import type { OrderSummary, PosOrder } from "@/lib/api/pos-order";
import { filterOrders, type OrderFilter } from "@/lib/api/pos-order-backend";

/**
 * Revenue is a sum, and the backend exposes no aggregate for it, so the range
 * is read through to total it. Ranges are small for a single store, but "All
 * time" is not bounded by anything — the read stops here and says so rather
 * than paging forever.
 */
const PAGE_SIZE = 200;
const MAX_ORDERS = 1000;

/** Every order matching the filters, newest first, up to `MAX_ORDERS`. */
async function loadOrders(businessId: string, filters: OrderFilter[]) {
    const orders: PosOrder[] = [];
    let pageNumber = 0;
    let truncated = false;

    for (;;) {
        const result = await filterOrders(businessId, filters, {
            page: pageNumber,
            size: PAGE_SIZE,
        });

        orders.push(...result.content);
        pageNumber += 1;

        if (
            result.content.length === 0 ||
            pageNumber >= result.page.totalPages
        ) {
            break;
        }

        if (orders.length >= MAX_ORDERS) {
            truncated = true;
            break;
        }
    }

    return { orders: orders.filter(isRealOrder), truncated };
}

/** Range-wide totals for Sale Management's stat cards. */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();
        const { orders, truncated } = await loadOrders(
            businessId,
            orderFiltersFromQuery(url),
        );

        // Revenue counts paid orders only — a pending or cancelled total is
        // money nobody has taken.
        const paid = orders.filter((order) => order.status === "PAID");

        return Response.json({
            totals: {
                orders: orders.length,
                revenue: paid.reduce((sum, order) => sum + order.total, 0),
                paid: paid.length,
                pending: orders.filter((order) => order.status === "PENDING")
                    .length,
            },
            truncated,
        } satisfies OrderSummary);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
