import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import type { ChannelStockAvailability } from "@/lib/api/channel-stock";

type RouteContext = { params: Promise<{ channel: string }> };

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
