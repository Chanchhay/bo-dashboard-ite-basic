import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { payOrderSchema, type Sale } from "@/lib/api/pos-order";
import {
    forgetOrder,
    getCurrentOrder,
    ordersPath,
} from "@/lib/api/pos-order-backend";

/**
 * Settles the sale.
 *
 * Whether the cash covers the total, and what change is owed, are the
 * backend's to decide — it also checks the cashier has an open register. The
 * terminal only reports what was tendered.
 */
export async function POST(request: Request) {
    try {
        const result = payOrderSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                { message: result.error.issues[0]?.message },
                { status: 400 },
            );
        }

        const order = await getCurrentOrder();

        if (!order) {
            return Response.json(
                { message: "There is no open order to pay for." },
                { status: 409 },
            );
        }

        if (order.items.length === 0) {
            return Response.json(
                { message: "Add an item before taking payment." },
                { status: 409 },
            );
        }

        const businessId = await getCurrentBusinessId();

        const sale = await backendRequest<Sale>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/pay`),
            { method: "PATCH", body: JSON.stringify(result.data) },
        );

        // The sale is closed, so this is no longer the cart. Forgetting it here
        // means the next tap opens a fresh order rather than trying to add a
        // line to something already paid.
        await forgetOrder();

        return Response.json(sale);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
