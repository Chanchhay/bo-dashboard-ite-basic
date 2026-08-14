import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    toUnitRequest,
    unitSchema,
    type Unit,
} from "@/lib/api/inventory";

type UnitRouteContext = {
    params: Promise<{ unitId: string }>;
};

/** Only a unit this business owns resolves; platform units answer 404. */
export async function PUT(request: Request, context: UnitRouteContext) {
    try {
        const result = unitSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const [{ unitId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const unit = await backendRequest<Unit>(
            `/api/v1/businesses/${businessId}/units/${encodeURIComponent(unitId)}`,
            {
                method: "PUT",
                body: JSON.stringify(toUnitRequest(result.data)),
            },
        );

        return Response.json(unit);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: Request,
    context: UnitRouteContext,
) {
    try {
        const [{ unitId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/units/${encodeURIComponent(unitId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
