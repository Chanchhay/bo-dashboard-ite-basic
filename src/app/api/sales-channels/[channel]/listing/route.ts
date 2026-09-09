import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    channelListingPath,
    saveChannelListingSchema,
    type ChannelListing,
} from "@/lib/api/channel-pricing";

type RouteContext = { params: Promise<{ channel: string }> };

export async function GET(_request: Request, context: RouteContext) {
    try {
        const [{ channel: channelId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const listing = await backendRequest<ChannelListing>(
            channelListingPath(businessId, channelId),
        );

        return Response.json(listing);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const result = saveChannelListingSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ channel: channelId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const listing = await backendRequest<ChannelListing>(
            channelListingPath(businessId, channelId),
            { method: "PUT", body: JSON.stringify(result.data) },
        );

        return Response.json(listing);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
