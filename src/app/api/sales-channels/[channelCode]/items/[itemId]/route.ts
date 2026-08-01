import { backendErrorResponse, backendRequest } from "@/lib/api/backend";

type RouteContext = {
    params: Promise<{ channelCode: string; itemId: string }>;
};

export async function DELETE(
    _request: Request,
    context: RouteContext,
) {
    try {
        const { channelCode, itemId } = await context.params;
        await backendRequest<void>(
            `/api/v1/sales-channels/${encodeURIComponent(channelCode)}/items/${encodeURIComponent(itemId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
