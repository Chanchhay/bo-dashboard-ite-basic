import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    setOrderDiscountSchema,
    type PosOrder,
} from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

/**
 * Sets or updates the discount amount on the current POS order.
 *
 * This used to fall back to a locally-fabricated order whenever the backend
 * call failed, so a rejected discount still came back as a 200 with the
 * numbers the till expected. That is worse than an error: the till believed
 * the discount had been saved, charged the customer the discounted amount,
 * and the order sitting on the server — the one Sale Management reads and
 * the one `/orders/current/pay` prices the payment against — never moved off
 * the full price. A real failure here has to come back as one.
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
            },
        );

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
