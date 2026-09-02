import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    forgetOrder,
    ordersPath,
    readOrderId,
} from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/** Deletes one order completely from the backend. */
export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const businessId = await getCurrentBusinessId();
        await backendRequest(
            ordersPath(businessId, `/${encodeURIComponent(id)}`),
            { method: "DELETE" },
        );

        if ((await readOrderId()) === id) {
            await forgetOrder();
        }

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
