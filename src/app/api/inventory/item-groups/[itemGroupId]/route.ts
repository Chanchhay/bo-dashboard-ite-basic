import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    itemGroupSchema,
    toItemGroupRequest,
    type ItemSubGroup,
} from "@/lib/api/inventory";

type ItemGroupRouteContext = {
    params: Promise<{ itemGroupId: string }>;
};

export async function PUT(
    request: Request,
    context: ItemGroupRouteContext,
) {
    try {
        const result = itemGroupSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ itemGroupId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const group = await backendRequest<ItemSubGroup>(
            `/api/v1/businesses/${businessId}/item-groups/${encodeURIComponent(itemGroupId)}`,
            {
                method: "PUT",
                body: JSON.stringify(toItemGroupRequest(result.data)),
            },
        );

        return Response.json(group);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: Request,
    context: ItemGroupRouteContext,
) {
    try {
        const [{ itemGroupId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/item-groups/${encodeURIComponent(itemGroupId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
