import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    readItemSave,
} from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

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
        const { body, error } = await readItemSave(request);

        if (error) {
            return error;
        }

        const businessId = await getInventoryBusinessId();
        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items`,
            { method: "POST", body },
        );

        return Response.json(item, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
