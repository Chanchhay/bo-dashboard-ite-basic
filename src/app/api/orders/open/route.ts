import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrderPage } from "@/lib/api/pos-order";
import { filterOrders } from "@/lib/api/pos-order-backend";

/** Lists the real pending orders for this business, newest first. */
export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const result = await filterOrders(
            businessId,
            [{ column: "status", value: "PENDING", operation: "EQUAL" }],
            { page: 0, size: 100 },
        );

        // Empty carts are not orders anyone opened, so they are counted out
        // here rather than paged around.
        const content = result.content.filter(
            (order) =>
                order.status === "PENDING" &&
                (order.items.length > 0 || Boolean(order.note?.trim())),
        );

        return Response.json({
            content,
            page: {
                size: result.page.size,
                number: result.page.number,
                totalElements: content.length,
                totalPages: content.length > 0 ? 1 : 0,
            },
        } satisfies PosOrderPage);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
