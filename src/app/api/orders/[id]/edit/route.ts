import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder } from "@/lib/api/pos-order";
import { ordersPath, rememberOrder } from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/** Makes an existing pending order the cart this terminal is editing. */
export async function POST(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const businessId = await getCurrentBusinessId();
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(id)}`),
        );

        if (order.status !== "PENDING") {
            return Response.json(
                { message: "Only pending orders can be edited." },
                { status: 409 },
            );
        }

        await rememberOrder(order.id);
        return Response.json(order);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
