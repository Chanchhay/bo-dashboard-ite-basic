import { z } from "zod";

import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import type { ItemChannel, ToggleItemChannelInput } from "@/lib/api/sales-channels";

type RouteContext = {
    params: Promise<{ id: string }>;
};

const toggleSchema = z.object({
    enabled: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const parseResult = toggleSchema.safeParse(await request.json());

        if (!parseResult.success) {
            return Response.json(
                { message: "Invalid toggle request payload." },
                { status: 400 },
            );
        }

        const updated = await backendRequest<ItemChannel>(
            `/api/v1/item-channels/${encodeURIComponent(id)}/toggle`,
            {
                method: "PATCH",
                body: JSON.stringify(parseResult.data satisfies ToggleItemChannelInput),
            },
        );

        return Response.json(updated);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
