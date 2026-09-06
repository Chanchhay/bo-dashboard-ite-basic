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
    itemPricingSchema,
    toItemPricingMultipart,
    type InventoryItem,
} from "@/lib/api/inventory";

type ItemRouteContext = { params: Promise<{ itemId: string }> };

/**
 * Prices an item and its options.
 *
 * The item update takes each field only when it is sent, so this writes the
 * amounts and leaves the rest of the item — images, description, attributes —
 * exactly as it found them.
 */
export async function PUT(request: Request, context: ItemRouteContext) {
    try {
        const result = itemPricingSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const payload = toItemPricingMultipart(result.data);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}`,
            {
                method: "PUT",
                body: payload.body,
                headers: { "Content-Type": payload.contentType },
            },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
