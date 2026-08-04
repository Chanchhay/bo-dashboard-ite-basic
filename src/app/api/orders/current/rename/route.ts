import { z } from "zod";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { PosOrder } from "@/lib/api/pos-order";
import { ensureCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

const renameSchema = z.object({
    note: z.string().trim().max(200, "Name must be 200 characters or fewer."),
});

/**
 * Names the sale — a table number, or who it is for.
 *
 * Opens a cart if there isn't one, so a cashier can name an order before
 * ringing anything into it.
 */
export async function PATCH(request: Request) {
    try {
        const result = renameSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const businessId = await getCurrentBusinessId();
        const order = await ensureCurrentOrder(businessId);

        const updated = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/note`),
            { method: "PATCH", body: JSON.stringify(result.data) },
        );

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
