import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { ItemChannel } from "@/lib/api/sales-channels";

type RouteContext = {
    params: Promise<{ itemId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { itemId } = await context.params;
        const itemChannels = await backendRequest<ItemChannel[]>(
            `/api/v1/item-channels/items/${encodeURIComponent(itemId)}`,
        );

        return Response.json(itemChannels);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
