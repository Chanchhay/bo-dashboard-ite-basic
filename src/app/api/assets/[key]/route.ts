import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";

type AssetRouteContext = {
    params: Promise<{ key: string }>;
};

export async function DELETE(
    _request: Request,
    context: AssetRouteContext,
) {
    try {
        const [{ key }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);

        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/assets/${encodeURIComponent(key)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
