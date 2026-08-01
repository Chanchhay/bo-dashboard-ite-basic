import { backendErrorResponse } from "@/lib/api/backend";
import {
    getAllInventoryItems,
    getInventoryBusinessId,
} from "@/lib/api/inventory-backend";

/** Full item options for stock screens that must resolve every item ID. */
export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const items = await getAllInventoryItems(businessId);

        return Response.json(items);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
