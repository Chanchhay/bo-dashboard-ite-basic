import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    channelListingPath,
    saveChannelListingSchema,
    type ChannelListing,
} from "@/lib/api/channel-pricing";

/**
 * The segment is named `channel` because its sibling routes address a channel
 * by code and Next allows one slug name per position. This one carries the
 * channel's id: the listing is per business per channel, and a code would have
 * to be looked up to get there anyway.
 */
type RouteContext = { params: Promise<{ channel: string }> };

/** What this channel sells, charges instead, and when it is open. */
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

/**
 * Saves the channel whole, as the screen shows it.
 *
 * A field left out is left alone; a field sent replaces what was there, so an
 * empty list is how you say "nothing" rather than "unchanged".
 */
export async function PUT(request: Request, context: RouteContext) {
    try {
        const result = saveChannelListingSchema.safeParse(await request.json());

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
