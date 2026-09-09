import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { boundedInteger, orderFiltersFromQuery } from "@/lib/api/order-filters";
import type { PosOrderPage } from "@/lib/api/pos-order";
import { filterOrders } from "@/lib/api/pos-order-backend";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const page = boundedInteger(url.searchParams.get("page"), 0, {
            max: 10_000,
        });
        const size = boundedInteger(url.searchParams.get("size"), 10, {
            min: 1,
            max: 50,
        });
        const businessId = await getCurrentBusinessId();
        url.searchParams.delete("status");
        const result = await filterOrders(
            businessId,
            [
                { column: "status", value: "PAID", operation: "EQUAL" },
                ...orderFiltersFromQuery(url),
            ],
            { page, size },
        );

        return Response.json({
            content: result.content.filter((order) => order.status === "PAID"),
            page: result.page,
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
