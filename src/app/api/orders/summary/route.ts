import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { isRealOrder, orderFiltersFromQuery } from "@/lib/api/order-filters";
import type { OrderSummary, PosOrder } from "@/lib/api/pos-order";
import { filterOrders, type OrderFilter } from "@/lib/api/pos-order-backend";

const PAGE_SIZE = 200;
const MAX_ORDERS = 1000;

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

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = await getCurrentBusinessId();

        const { orders: allOrders, truncated } = await loadOrders(
            businessId,
            orderFiltersFromQuery(url),
        );

        const paid = allOrders.filter((order) => order.status === "PAID");

        return Response.json({
            totals: {
                orders: allOrders.length,
                revenue: paid.reduce((sum, order) => sum + order.total, 0),
                paid: paid.length,
                pending: allOrders.filter((order) => order.status === "PENDING")
                    .length,
            },
            truncated,
        } satisfies OrderSummary);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
