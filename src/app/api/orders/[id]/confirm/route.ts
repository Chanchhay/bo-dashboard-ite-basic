import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder } from "@/lib/api/pos-order";
import { ordersPath } from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Accepts one pending order and takes its stock off the shelf right away —
 * payment can still come later. Only a PENDING order can be confirmed.
 */
export async function POST(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const businessId = await getCurrentBusinessId();
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(id)}/confirm`),
            { method: "PATCH" },
        );

        return Response.json(order);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
