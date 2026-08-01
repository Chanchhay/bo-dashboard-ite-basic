import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

const reorderSchema = z.object({
    imageIds: z
        .array(z.string().trim().min(1))
        .min(1, "Send the images in their new order."),
});

type ItemRouteContext = {
    params: Promise<{ itemId: string }>;
};

/** Position is server-assigned, so the whole order is sent at once. */
export async function PUT(request: Request, context: ItemRouteContext) {
    try {
        const result = reorderSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/images/order`,
            { method: "PUT", body: JSON.stringify(result.data) },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
