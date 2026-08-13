import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { StockBatch } from "@/lib/api/inventory";

type RouteContext = { params: Promise<{ itemId: string }> };

/** The deliveries still on the shelf for one item, in the order they sell. */
export async function GET(_request: Request, context: RouteContext) {
    try {
        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);

        const batches = await backendRequest<StockBatch[]>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/stock-batches`,
        );

        return Response.json(batches);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
