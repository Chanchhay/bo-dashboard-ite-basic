import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
    inventoryItemSchema,
    toItemRequest,
    type InventoryItem,
} from "@/lib/api/inventory";

export async function GET() {
    try {
        const businessId = await getInventoryBusinessId();
        const items = await backendRequest<InventoryItem[]>(
            `/api/v1/businesses/${businessId}/items`,
        );

        return Response.json(items);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const result = inventoryItemSchema.safeParse(
            await request.json(),
        );

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        const businessId = await getInventoryBusinessId();
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items`,
            {
                method: "POST",
                body: JSON.stringify(toItemRequest(result.data)),
            },
        );

        return Response.json(item, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
