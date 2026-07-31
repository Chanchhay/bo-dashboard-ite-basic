import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { StockSummary } from "@/lib/api/inventory";

export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const stock = await backendRequest<StockSummary[]>(
            `/api/v1/businesses/${businessId}/stock-entries/current`,
        );

        return Response.json(stock);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
