import { z } from "zod";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type {
    CreateItemChannelInput,
    ItemChannel,
} from "@/lib/api/sales-channels";

const createItemChannelSchema = z.object({
    itemId: z.string().uuid("Select a valid item."),
    salesChannelId: z.string().uuid("Select a valid sales channel."),
});

export async function POST(request: Request) {
    try {
        const body = createItemChannelSchema.safeParse(await request.json());

        if (!body.success) {
            return Response.json(
                {
                    message: "Choose an item and a sales channel.",
                    fieldErrors: z.flattenError(body.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        const itemChannel = await backendRequest<ItemChannel>(
            "/api/v1/item-channels",
            {
                method: "POST",
                body: JSON.stringify(body.data satisfies CreateItemChannelInput),
            },
        );

        return Response.json(itemChannel, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
