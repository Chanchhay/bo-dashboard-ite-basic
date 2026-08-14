import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    addOnSchema,
    toAddOnRequest,
    type AddOn,
} from "@/lib/api/inventory";

type AddOnRouteContext = {
    params: Promise<{ addOnId: string }>;
};

export async function PUT(request: Request, context: AddOnRouteContext) {
    try {
        const result = addOnSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ addOnId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const addOn = await backendRequest<AddOn>(
            `/api/v1/businesses/${businessId}/add-ons/${encodeURIComponent(addOnId)}`,
            {
                method: "PUT",
                body: JSON.stringify(toAddOnRequest(result.data)),
            },
        );

        return Response.json(addOn);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: Request,
    context: AddOnRouteContext,
) {
    try {
        const [{ addOnId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/add-ons/${encodeURIComponent(addOnId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
