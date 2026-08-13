import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import { itemAddOnsSchema, type InventoryItem } from "@/lib/api/inventory";

type ItemRouteContext = { params: Promise<{ itemId: string }> };

/**
 * Changes which add-ons an item offers, and nothing else about it.
 *
 * Narrow on purpose: toggling one add-on from a row in a list must not be able
 * to rewrite the item's name, images or description on its way past.
 */
export async function PUT(request: Request, context: ItemRouteContext) {
    try {
        const result = itemAddOnsSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/add-ons`,
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
