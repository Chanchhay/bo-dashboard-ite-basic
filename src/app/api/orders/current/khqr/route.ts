import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { Khqr } from "@/lib/api/pos-order";
import { getCurrentOrder, ordersPath } from "@/lib/api/pos-order-backend";

export async function POST() {
    try {
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

        const khqr = await backendRequest<Khqr>(
            ordersPath(businessId, `/${encodeURIComponent(order.id)}/khqr`),
            { method: "POST" },
        );

        return Response.json(khqr);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
