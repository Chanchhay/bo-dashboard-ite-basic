import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder } from "@/lib/api/pos-order";
import { ordersPath } from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Owner-only: approves a storefront Pay Later order, taking its stock off
 * the shelf now. Only an order still awaiting that approval can be approved.
 */
export async function POST(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const businessId = await getCurrentBusinessId();
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(id)}/pay-later/approve`),
            { method: "PATCH" },
        );

        return Response.json(order);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
