import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    saveItemChannelStockSchema,
    type ItemChannelStock,
} from "@/lib/api/channel-stock";

type RouteContext = { params: Promise<{ itemId: string }> };

function channelStockPath(businessId: string, itemId: string) {
    return `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/channel-stock`;
}

/** How this item's one balance is shared out between the channels selling it. */
export async function GET(_request: Request, context: RouteContext) {
    try {
        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);

        const channelStock = await backendRequest<ItemChannelStock>(
            channelStockPath(businessId, itemId),
        );

        return Response.json(channelStock);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

/**
 * Replaces the split whole.
 *
 * Sent as one piece because it is decided as one: a mode and the shares that
 * go with it. Saving a share without the mode it belongs to could leave an
 * item allocated to one channel and open to the rest.
 */
export async function PUT(request: Request, context: RouteContext) {
    try {
        const result = saveItemChannelStockSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);

        const channelStock = await backendRequest<ItemChannelStock>(
            channelStockPath(businessId, itemId),
            { method: "PUT", body: JSON.stringify(result.data) },
        );

        return Response.json(channelStock);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
