import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    readItemSave,
} from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

type ItemRouteContext = {
    params: Promise<{ itemId: string }>;
};

export async function GET(
    _request: Request,
    context: ItemRouteContext,
) {
    try {
        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}`,
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(
    request: Request,
    context: ItemRouteContext,
) {
    try {
        const { body, error } = await readItemSave(request);

        if (error) {
            return error;
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}`,
            { method: "PUT", body },
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

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
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
