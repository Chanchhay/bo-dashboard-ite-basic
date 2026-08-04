import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder } from "@/lib/api/pos-order";
import {
    forgetOrder,
    ordersPath,
    readOrderId,
} from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/** Cancels one pending order after the cashier confirms the destructive action. */
export async function POST(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const businessId = await getCurrentBusinessId();
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(id)}/cancel`),
            { method: "PATCH" },
        );

        if ((await readOrderId()) === order.id) {
            await forgetOrder();
        }

        return Response.json(order);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
