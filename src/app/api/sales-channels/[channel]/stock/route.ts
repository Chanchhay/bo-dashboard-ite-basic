import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { ChannelStockAvailability } from "@/lib/api/channel-stock";

/** The segment carries the channel's code here, as its sibling `items` does. */
type RouteContext = { params: Promise<{ channel: string }> };

/**
 * What this channel may still sell, for everything it sells.
 *
 * One read for a whole till screen. Items the shop has not split are absent
 * rather than reported at their full shelf figure: they have no ceiling, and
 * the screen already knows what is on the shelf.
 */
export async function GET(_request: Request, context: RouteContext) {
    try {
        const [{ channel: channelCode }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);

        const availability = await backendRequest<ChannelStockAvailability[]>(
            `/api/v1/businesses/${businessId}/sales-channels/${encodeURIComponent(channelCode)}/stock`,
        );

        return Response.json(availability);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
