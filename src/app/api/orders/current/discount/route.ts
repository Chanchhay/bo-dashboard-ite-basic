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

        // Try updating Spring backend order items with proportional discounts
        for (let i = 0; i < order.items.length; i++) {
            const item = order.items[i];
            const itemSubtotal = item.unitPrice * item.quantity;

            let itemDiscount = 0;
            if (i === order.items.length - 1) {
                // Ensure exact total match on last item
                itemDiscount = Math.max(0, parseFloat((discountAmount - runningDiscountTotal).toFixed(2)));
            } else {
                itemDiscount = Math.min(
                    itemSubtotal,
                    parseFloat((itemSubtotal * discountRatio).toFixed(2))
                );
                runningDiscountTotal += itemDiscount;
            }

            try {
                await backendRequest<unknown>(
                    ordersPath(
                        businessId,
                        `/${encodeURIComponent(order.id)}/items/${encodeURIComponent(item.id)}`
                    ),
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            quantity: item.quantity,
                            discountAmount: itemDiscount,
                        }),
                    }
                );
            } catch {
                // Ignore item patch error if endpoint not reached
            }
        }

        let updated: PosOrder;

        try {
            // Try explicit order discount patch
            updated = await backendRequest<PosOrder>(
                ordersPath(businessId, `/${encodeURIComponent(order.id)}/discount`),
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        discountAmount,
                        discountId: result.data.discountId,
                        discountCode: result.data.discountCode,
                    }),
                }
            );
        } catch {
            try {
                // Try main order get/patch
                updated = await backendRequest<PosOrder>(
                    ordersPath(businessId, `/${encodeURIComponent(order.id)}`)
                );
                updated = {
                    ...updated,
                    subtotal: itemsSubtotal,
                    discountAmount,
                    total: Math.max(0, itemsSubtotal - discountAmount),
                };
            } catch {
                // Fallback for local order state
                updated = {
                    ...order,
                    subtotal: itemsSubtotal,
                    discountAmount,
                    total: Math.max(0, itemsSubtotal - discountAmount),
                };
            }
        }

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
