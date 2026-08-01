import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import { type InventoryItem } from "@/lib/api/inventory";

type BarcodeRouteContext = {
    params: Promise<{ barcode: string }>;
};

export async function GET(
    _request: Request,
    context: BarcodeRouteContext,
) {
    try {
        const [{ barcode }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);

        if (!barcode.trim()) {
            return Response.json(
                { message: "Enter a barcode to find an item." },
                { status: 400 },
            );
        }

        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items/barcode/${encodeURIComponent(barcode)}`,
        );

        return Response.json(item);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
