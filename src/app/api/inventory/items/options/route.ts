import { backendErrorResponse } from "@/lib/api/backend";
import {
    getAllInventoryItems,
    getInventoryBusinessId,
} from "@/lib/api/inventory-backend";

export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const items = await getAllInventoryItems(businessId);

        return Response.json(items);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
