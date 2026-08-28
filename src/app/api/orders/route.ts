import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    boundedInteger,
    isRealOrder,
    orderFiltersFromQuery,
} from "@/lib/api/order-filters";
import type { PosOrder, PosOrderPage } from "@/lib/api/pos-order";
import { filterOrders } from "@/lib/api/pos-order-backend";

import { getSyncedOrders } from "@/lib/synced-orders-store";

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
        let resultContent: PosOrder[] = [];
        let resultPage = { number: page, size, totalElements: 0, totalPages: 1 };

        try {
            const result = await filterOrders(
                businessId,
                orderFiltersFromQuery(url),
                { page, size },
            );
            resultContent = result.content.filter(isRealOrder);
            resultPage = result.page;
        } catch {
            // Fallback if backend server endpoint fails or is un-configured
        }

        const synced = getSyncedOrders(url);
        const combinedContent = [...synced, ...resultContent];
        const totalElements = (resultPage.totalElements || 0) + synced.length;
        const totalPages = Math.max(
            1,
            Math.ceil(totalElements / Math.max(size, 1)),
        );

        return Response.json({
            content: combinedContent,
            page: {
                ...resultPage,
                totalElements,
                totalPages,
            },
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
