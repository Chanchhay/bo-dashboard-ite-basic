import {
    backendErrorResponse,
    backendRequest,
    readJsonBody,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    itemAddOnAvailabilitySchema,
    type InventoryItem,
} from "@/lib/api/inventory";

type RouteContext = { params: Promise<{ itemId: string; addOnId: string }> };

/**
 * Takes one add-on off an item's menu, or puts it back.
 *
 * Off is not detached: the item still offers it, so nothing about the setup is
 * lost while it is unavailable.
 */
export async function PUT(request: Request, context: RouteContext) {
    try {
        const result = itemAddOnAvailabilitySchema.safeParse(
            await readJsonBody(request),
        );

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ itemId, addOnId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/add-ons/${encodeURIComponent(addOnId)}`,
            {
                method: "PUT",
                body: JSON.stringify(result.data),
            },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
