import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { StockEntry } from "@/lib/api/inventory";

type RouteContext = { params: Promise<{ stockEntryId: string }> };

export async function GET(_request: Request, context: RouteContext) {
    try {
        const [{ stockEntryId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);

        const entry = await backendRequest<StockEntry>(
            `/api/v1/businesses/${businessId}/stock-entries/${encodeURIComponent(stockEntryId)}`,
        );

        return Response.json(entry);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
