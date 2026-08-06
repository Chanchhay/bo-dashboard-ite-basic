import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    boundedInteger,
    isRealOrder,
    orderFiltersFromQuery,
} from "@/lib/api/order-filters";
import type { PosOrderPage } from "@/lib/api/pos-order";
import { filterOrders } from "@/lib/api/pos-order-backend";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * One page of orders for Sale Management: any status, filtered and sorted
 * newest first.
 *
 * The backend pages the filter query, so only the rows on screen are read.
 * Range-wide figures come from `/orders/summary`, which is cached on the
 * filters alone and so survives paging without being recounted.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const page = boundedInteger(url.searchParams.get("page"), 0, {
            max: 10_000,
        });
        const size = boundedInteger(
            url.searchParams.get("size"),
            DEFAULT_PAGE_SIZE,
            { min: 1, max: MAX_PAGE_SIZE },
        );
        const businessId = await getCurrentBusinessId();
        const result = await filterOrders(
            businessId,
            orderFiltersFromQuery(url),
            { page, size },
        );

        return Response.json({
            // Empty carts are dropped from the rows but left in the count:
            // the backend paged and totalled before they could be excluded,
            // and a page short of a row is better than a total that drifts.
            content: result.content.filter(isRealOrder),
            page: result.page,
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
