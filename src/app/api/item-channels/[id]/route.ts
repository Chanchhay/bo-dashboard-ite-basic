import { backendErrorResponse, backendRequest } from "@/lib/api/backend";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        await backendRequest<void>(
            `/api/v1/item-channels/${encodeURIComponent(id)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
