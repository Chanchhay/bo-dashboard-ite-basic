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
          
            content: result.content.filter(isRealOrder),
            page: result.page,
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
