import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
} from "@/lib/api/inventory-backend";

type ItemRouteContext = {
    params: Promise<{ itemId: string }>;
};

export async function DELETE(
    _request: Request,
    context: ItemRouteContext,
) {
    try {
        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/permanent`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
