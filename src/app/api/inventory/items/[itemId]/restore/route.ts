import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
} from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

type ItemRouteContext = {
    params: Promise<{ itemId: string }>;
};

export async function PATCH(
    _request: Request,
    context: ItemRouteContext,
) {
    try {
        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/restore`,
            { method: "PATCH" },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
