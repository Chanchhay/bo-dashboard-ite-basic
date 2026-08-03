import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    forgetOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";

/**
 * Abandons the sale.
 *
 * The order is cancelled rather than emptied, so a walked-away customer leaves
 * a record instead of vanishing. The next tap opens a fresh cart.
 */
export async function POST() {
    try {
        const order = await getCurrentOrder();

        if (order) {
            const businessId = await getCurrentBusinessId();

            await backendRequest(
                ordersPath(
                    businessId,
                    `/${encodeURIComponent(order.id)}/cancel`,
                ),
                { method: "PATCH" },
            );
        }

        await forgetOrder();

        return Response.json(null);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
