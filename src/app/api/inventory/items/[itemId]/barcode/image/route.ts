import { backendErrorResponse } from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    inventoryBarcodeImageResponse,
} from "@/lib/api/inventory-backend";

type ItemBarcodeRouteContext = {
    params: Promise<{ itemId: string }>;
};

export async function GET(
    request: Request,
    context: ItemBarcodeRouteContext,
) {
    try {
        const requestUrl = new URL(request.url);
        const query = new URLSearchParams();

        for (const dimension of ["width", "height"] as const) {
            const value = requestUrl.searchParams.get(dimension);

            if (value !== null) {
                query.set(dimension, value);
            }
        }

        const [{ itemId }, businessId] = await Promise.all([
            context.params,
            getInventoryBusinessId(),
        ]);
        const suffix = query.size ? `?${query}` : "";

        return inventoryBarcodeImageResponse(
            `/api/v1/businesses/${businessId}/items/${encodeURIComponent(itemId)}/barcode/image${suffix}`,
            `item-${itemId}-barcode.png`,
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}
