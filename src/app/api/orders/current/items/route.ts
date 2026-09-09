import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { addOrderItemSchema, type PosOrder } from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

export async function POST(request: Request) {
    try {
        const result = addOrderItemSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        const order = await ensureCurrentOrder(businessId);

        const { itemId, variantId, unitId, addOnIds, quantity } = result.data;

        const updated = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/items`),
            {
                method: "POST",
                body: JSON.stringify({
                    itemId,
                    variantId,
                    unitId,
                    addOnIds,
                    quantity,
                }),
            },
        );

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
