import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { InventoryItem } from "@/lib/api/inventory";

export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();

        const items = await backendRequest<InventoryItem[]>(
            `/api/v1/businesses/${businessId}/items`,
        );
        return Response.json(items);
    } catch (error) {
        console.error("===> backend error:", error);
        return backendErrorResponse(error);
    }
}