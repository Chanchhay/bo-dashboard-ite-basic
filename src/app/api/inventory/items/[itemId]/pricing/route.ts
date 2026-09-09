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
