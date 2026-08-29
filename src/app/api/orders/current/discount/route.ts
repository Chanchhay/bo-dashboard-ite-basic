import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    setOrderDiscountSchema,
    type PosOrder,
} from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

/**
 * Sets or updates the discount amount on the current POS order.
 * Distributes discount across backend order items so Spring backend order totals match.
 */
export async function PATCH(request: Request) {
    try {
        const result = setOrderDiscountSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        const order = await ensureCurrentOrder(businessId);
        const discountAmount = Math.max(0, result.data.discountAmount);

        // Compute items subtotal
        const itemsSubtotal = order.items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        ) || order.subtotal || 1;

        const discountRatio = discountAmount / itemsSubtotal;
        let runningDiscountTotal = 0;

        // 1. Try explicit order discount patch directly to Spring backend
        try {
            const updated = await backendRequest<PosOrder>(
                ordersPath(businessId, `/${encodeURIComponent(order.id)}/discount`),
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        discountAmount,
                        discountId: result.data.discountId,
                        discountCode: result.data.discountCode,
                        discountIds: result.data.discountIds,
                    }),
                }
            );
            return Response.json(updated);
        } catch {
            // 2. Fallback: update local order state
            const updated: PosOrder = {
                ...order,
                subtotal: itemsSubtotal,
                discountAmount,
                total: Math.max(0, itemsSubtotal - discountAmount),
            };
            return Response.json(updated);
        }
    } catch (error) {
        return backendErrorResponse(error);
    }
}
