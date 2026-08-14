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

/**
 * The business-scoped list: the platform's units plus this business's own.
 *
 * The global `/api/v1/units` would hide the units an owner defined, which are
 * the ones that make their conversions readable.
 */
export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const units = await backendRequest<Unit[]>(
            `/api/v1/businesses/${businessId}/units`,
        );

        return Response.json(units);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const result = unitSchema.safeParse(await request.json());

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const businessId = await getInventoryBusinessId();
        const unit = await backendRequest<Unit>(
            `/api/v1/businesses/${businessId}/units`,
            {
                method: "POST",
                body: JSON.stringify(toUnitRequest(result.data)),
            },
        );

        return Response.json(unit, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
