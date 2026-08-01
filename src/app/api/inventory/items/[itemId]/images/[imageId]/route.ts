import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

type ItemImageRouteContext = {
    params: Promise<{ itemId: string; imageId: string }>;
};

export async function DELETE(
    _request: Request,
    context: ItemImageRouteContext,
) {
    try {
        const [{ itemId, imageId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}` +
                `/images/${encodeURIComponent(imageId)}`,
            { method: "DELETE" },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
