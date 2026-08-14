import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    addOnSetSchema,
    toAddOnSetRequest,
    type AddOnSet,
} from "@/lib/api/inventory";

type AddOnSetRouteContext = {
    params: Promise<{ setId: string }>;
};

export async function PUT(request: Request, context: AddOnSetRouteContext) {
    try {
        const result = addOnSetSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ setId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const set = await backendRequest<AddOnSet>(
            `/api/v1/businesses/${businessId}/add-on-sets/${encodeURIComponent(setId)}`,
            {
                method: "PUT",
                body: JSON.stringify(toAddOnSetRequest(result.data)),
            },
        );

        return Response.json(set);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: Request,
    context: AddOnSetRouteContext,
) {
    try {
        const [{ setId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/add-on-sets/${encodeURIComponent(setId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
