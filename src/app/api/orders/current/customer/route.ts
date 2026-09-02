import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    setOrderCustomerSchema,
    type PosOrder,
} from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

/**
 * Attaches or detaches a customer on the current order.
 *
 * Two real backend shapes are tried — the order's own `/customer` endpoint,
 * then a plain PATCH on the order itself — because either could be the one
 * this backend actually implements. What used to follow both was a silent
 * fallback to a locally-fabricated order, which meant a customer that failed
 * to attach on the server still looked attached on the till. That is worse
 * than surfacing the failure: the receipt and the customer's purchase
 * history would silently disagree about who this sale was for.
 */
export async function PATCH(request: Request) {
    try {
        const result = setOrderCustomerSchema.safeParse(await request.json());

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
