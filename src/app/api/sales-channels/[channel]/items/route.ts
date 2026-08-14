import { z } from "zod";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type {
    ChannelItem,
    ItemChannel,
    PostChannelItemInput,
} from "@/lib/api/sales-channels";

type RouteContext = {
    params: Promise<{ channel: string }>;
};

const postChannelItemSchema = z.object({
    itemId: z.string().uuid("Invalid item ID."),
    enabled: z.boolean().optional(),
});

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { channel: channelCode } = await context.params;
        const items = await backendRequest<ChannelItem[]>(
            `/api/v1/sales-channels/${encodeURIComponent(channelCode)}/items`,
        );

        return Response.json(items);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(
    request: Request,
    context: RouteContext,
) {
    try {
        const { channel: channelCode } = await context.params;
        const parseResult = postChannelItemSchema.safeParse(await request.json());

        if (!parseResult.success) {
            return Response.json(
                {
                    message: "Select a valid item to post on this channel.",
                    fieldErrors: z.flattenError(parseResult.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        const itemChannel = await backendRequest<ItemChannel>(
            `/api/v1/sales-channels/${encodeURIComponent(channelCode)}/items`,
            {
                method: "POST",
                body: JSON.stringify(parseResult.data satisfies PostChannelItemInput),
            },
        );

        return Response.json(itemChannel, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
