import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { addOrderItemSchema, type PosOrder } from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

/**
 * Rings an item onto the cart, opening one if the sale has just begun.
 *
 * Tapping the same item again is left to the backend, which merges it into the
 * existing line. Deciding that here would race a cashier double-tapping faster
 * than the response comes back.
 */
export async function POST(request: Request) {
    try {
        const result = addOrderItemSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        const order = await ensureCurrentOrder(businessId);

        const { itemId, variantId, quantity } = result.data;

        const updated = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/items`),
            {
                method: "POST",
                body: JSON.stringify({ itemId, variantId, quantity }),
            },
        );

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
