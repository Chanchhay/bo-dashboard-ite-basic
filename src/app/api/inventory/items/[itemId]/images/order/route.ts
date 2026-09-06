import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
    readJsonBody,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import { maxItemImages, type InventoryItem } from "@/lib/api/inventory";

const reorderSchema = z.object({
    imageIds: z
        .array(z.string().trim().min(1))
        .min(1, "Send the images in their new order.")
        // An item never holds more than this, so a longer list is malformed
        // rather than something to pass on to the backend.
        .max(maxItemImages, `An item can have at most ${maxItemImages} images.`),
});

type ItemRouteContext = {
    params: Promise<{ itemId: string }>;
};

/** Position is server-assigned, so the whole order is sent at once. */
export async function PUT(request: Request, context: ItemRouteContext) {
    try {
        const result = reorderSchema.safeParse(await readJsonBody(request));

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
