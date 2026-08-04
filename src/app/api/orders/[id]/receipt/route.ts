import {
    BackendApiError,
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type {
    PosOrder,
    PosReceipt,
    PosReceiptDetail,
} from "@/lib/api/pos-order";
import { ordersPath } from "@/lib/api/pos-order-backend";

type RouteContext = { params: Promise<{ id: string }> };

/** Returns the paid order and any receipt metadata already issued for it. */
export async function GET(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const businessId = await getCurrentBusinessId();
        const encodedId = encodeURIComponent(id);
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodedId}`),
        );

        if (order.status !== "PAID") {
            return Response.json(
                { message: "A receipt is available only after an order is paid." },
                { status: 409 },
            );
        }

        let receipt: PosReceipt | null = null;

        try {
            receipt = await backendRequest<PosReceipt>(
                ordersPath(businessId, `/${encodedId}/receipt`),
            );
        } catch (error) {
            // Some payment methods issue metadata asynchronously. The paid
            // order is still a valid, printable receipt source in that window.
            if (!(error instanceof BackendApiError && error.status === 404)) {
                throw error;
            }
        }

        return Response.json({ order, receipt } satisfies PosReceiptDetail);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
