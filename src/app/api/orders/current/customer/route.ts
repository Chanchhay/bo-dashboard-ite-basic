import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    setOrderCustomerSchema,
    type PosOrder,
} from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

export async function PATCH(request: Request) {
    try {
        const result = setOrderCustomerSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        const order = await ensureCurrentOrder(businessId);
        const customerId = result.data.customerId ?? null;

        let updated: PosOrder;

        try {
            updated = await backendRequest<PosOrder>(
                ordersPath(businessId, `/${encodeURIComponent(order.id)}/customer`),
                {
                    method: "PATCH",
                    body: JSON.stringify({ customerId }),
                },
            );
        } catch {
            updated = await backendRequest<PosOrder>(
                ordersPath(businessId, `/${encodeURIComponent(order.id)}`),
                {
                    method: "PATCH",
                    body: JSON.stringify({ customerId }),
                },
            );
        }

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
