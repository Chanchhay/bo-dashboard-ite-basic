import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { StockEntry } from "@/lib/api/inventory";

type RouteContext = { params: Promise<{ stockEntryId: string }> };

/**
 * One movement, with the batches it drew from.
 *
 * The list endpoint leaves the breakdown out — it would be a query per row to
 * answer something no row shows. It is read here, where somebody has opened a
 * single movement and is asking why it cost what it did.
 */
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
